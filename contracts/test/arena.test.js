import { expect } from 'chai';
import hre from 'hardhat';

const { ethers } = hre;

const ROOM = ethers.id('bronze');
const FEE = ethers.parseEther('0.01');
const runId = (n) => ethers.id(`run-${n}`);

async function deployFixture() {
  const [admin, player, settler, outsider, treasury] = await ethers.getSigners();

  const Rewards = await ethers.getContractFactory('ElementalRewards');
  const rewards = await Rewards.deploy(admin.address);

  const Arena = await ethers.getContractFactory('ElementalArena');
  const arena = await Arena.deploy(admin.address, treasury.address);

  await arena.setRewardsContract(await rewards.getAddress());
  await rewards.grantRole(await rewards.MINTER_ROLE(), await arena.getAddress());
  await arena.grantRole(await arena.SETTLER_ROLE(), settler.address);
  await arena.setEntryFee(ROOM, FEE);

  return { admin, player, settler, outsider, treasury, arena, rewards };
}

describe('ElementalArena', () => {
  describe('entry', () => {
    it('accepts the exact configured fee and records the run', async () => {
      const { arena, player } = await deployFixture();
      const id = runId('entry');

      await expect(arena.connect(player).enterGame(id, ROOM, { value: FEE }))
        .to.emit(arena, 'GameEntered')
        .withArgs(id, player.address, ROOM, FEE, 0);

      const run = await arena.getRun(id);
      expect(run.player).to.equal(player.address);
      expect(run.state).to.equal(1n); // ENTERED
    });

    it('rejects an underpaid or overpaid entry', async () => {
      const { arena, player } = await deployFixture();
      await expect(
        arena.connect(player).enterGame(runId('under'), ROOM, { value: FEE - 1n })
      ).to.be.revertedWithCustomError(arena, 'IncorrectEntryFee');
      await expect(
        arena.connect(player).enterGame(runId('over'), ROOM, { value: FEE + 1n })
      ).to.be.revertedWithCustomError(arena, 'IncorrectEntryFee');
    });

    it('rejects a disabled room', async () => {
      const { arena, player } = await deployFixture();
      await expect(
        arena.connect(player).enterGame(runId('bad-room'), ethers.id('nonexistent'), { value: FEE })
      ).to.be.revertedWithCustomError(arena, 'RoomDisabled');
    });

    it('rejects a duplicate run id', async () => {
      const { arena, player } = await deployFixture();
      const id = runId('dupe');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });
      await expect(
        arena.connect(player).enterGame(id, ROOM, { value: FEE })
      ).to.be.revertedWithCustomError(arena, 'RunAlreadyExists');
    });

    it('increments a per-player nonce on each entry', async () => {
      const { arena, player } = await deployFixture();
      await arena.connect(player).enterGame(runId('n1'), ROOM, { value: FEE });
      await arena.connect(player).enterGame(runId('n2'), ROOM, { value: FEE });
      expect(await arena.nonces(player.address)).to.equal(2n);
    });
  });

  describe('settlement', () => {
    it('mints the reward on a claim and emits both events', async () => {
      const { arena, rewards, player, settler } = await deployFixture();
      const id = runId('claim');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });

      await expect(arena.connect(settler).settleClaim(id, 7, 'ipfs://token-7'))
        .to.emit(arena, 'RewardClaimed')
        .withArgs(id, player.address, 7)
        .and.to.emit(arena, 'NFTMinted');

      expect(await rewards.ownerOf(1)).to.equal(player.address);
      expect(await rewards.rewardLevelOf(1)).to.equal(7n);
      expect(await rewards.tokenURI(1)).to.equal('ipfs://token-7');
    });

    it('refuses a second claim for the same run', async () => {
      const { arena, player, settler } = await deployFixture();
      const id = runId('double-claim');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });
      await arena.connect(settler).settleClaim(id, 3, 'ipfs://a');

      await expect(
        arena.connect(settler).settleClaim(id, 3, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'RunAlreadySettled');
    });

    it('refuses a claim after a loss is settled', async () => {
      const { arena, player, settler } = await deployFixture();
      const id = runId('loss-then-claim');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });
      await arena.connect(settler).settleLoss(id, 4);

      await expect(
        arena.connect(settler).settleClaim(id, 4, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'RunAlreadySettled');
    });

    it('rejects a reward level above the maximum', async () => {
      const { arena, player, settler } = await deployFixture();
      const id = runId('too-high');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });
      await expect(
        arena.connect(settler).settleClaim(id, 16, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'InvalidRewardLevel');
      await expect(
        arena.connect(settler).settleClaim(id, 0, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'InvalidRewardLevel');
    });

    it('rejects settlement of a run that does not exist', async () => {
      const { arena, settler } = await deployFixture();
      await expect(
        arena.connect(settler).settleClaim(runId('ghost'), 1, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'RunNotFound');
    });
  });

  describe('access control', () => {
    it('only a settler can settle', async () => {
      const { arena, player, outsider } = await deployFixture();
      const id = runId('acl');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });
      await expect(
        arena.connect(outsider).settleClaim(id, 1, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'Unauthorized');
    });

    it('only an admin can change entry fees or the treasury', async () => {
      const { arena, outsider } = await deployFixture();
      await expect(arena.connect(outsider).setEntryFee(ROOM, 1n)).to.be.revertedWithCustomError(arena, 'Unauthorized');
      await expect(arena.connect(outsider).setTreasury(outsider.address)).to.be.revertedWithCustomError(arena, 'Unauthorized');
    });

    it('emits EntryFeeUpdated with the previous and new fee', async () => {
      const { arena } = await deployFixture();
      await expect(arena.setEntryFee(ROOM, ethers.parseEther('0.02')))
        .to.emit(arena, 'EntryFeeUpdated')
        .withArgs(ROOM, FEE, ethers.parseEther('0.02'));
    });

    it('lets an admin revoke a role', async () => {
      const { arena, settler, player } = await deployFixture();
      const settlerRole = await arena.SETTLER_ROLE();
      await arena.revokeRole(settlerRole, settler.address);
      expect(await arena.hasRole(settlerRole, settler.address)).to.equal(false);

      const id = runId('revoked');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });
      await expect(
        arena.connect(settler).settleClaim(id, 1, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'Unauthorized');
    });
  });

  describe('pause', () => {
    it('blocks entry and settlement while paused, and resumes after unpause', async () => {
      const { arena, player, settler } = await deployFixture();
      const id = runId('paused');
      await arena.connect(player).enterGame(id, ROOM, { value: FEE });

      await expect(arena.pause()).to.emit(arena, 'GamePaused');

      await expect(
        arena.connect(player).enterGame(runId('while-paused'), ROOM, { value: FEE })
      ).to.be.revertedWithCustomError(arena, 'ContractPaused');
      await expect(
        arena.connect(settler).settleClaim(id, 2, 'ipfs://a')
      ).to.be.revertedWithCustomError(arena, 'ContractPaused');

      await arena.unpause();
      await expect(arena.connect(settler).settleClaim(id, 2, 'ipfs://a')).to.emit(arena, 'RewardClaimed');
    });

    it('only an operator can pause', async () => {
      const { arena, outsider } = await deployFixture();
      await expect(arena.connect(outsider).pause()).to.be.revertedWithCustomError(arena, 'Unauthorized');
    });
  });

  describe('treasury', () => {
    it('sweeps collected fees to the treasury', async () => {
      const { arena, player, treasury } = await deployFixture();
      await arena.connect(player).enterGame(runId('sweep'), ROOM, { value: FEE });

      const before = await ethers.provider.getBalance(treasury.address);
      await arena.withdrawFees();
      const after = await ethers.provider.getBalance(treasury.address);

      expect(after - before).to.equal(FEE);
      expect(await arena.collectedFees()).to.equal(0n);
    });

    it('reverts when there is nothing to withdraw', async () => {
      const { arena } = await deployFixture();
      await expect(arena.withdrawFees()).to.be.revertedWithCustomError(arena, 'NothingToWithdraw');
    });
  });

  describe('reentrancy', () => {
    it('blocks a re-entrant refund from a malicious receiver', async () => {
      const { arena, admin } = await deployFixture();
      const Malicious = await ethers.getContractFactory('MaliciousReceiver');
      const attacker = await Malicious.deploy(await arena.getAddress());

      const id = ethers.id('attack-run');
      await attacker.enter(id, ROOM, { value: FEE });
      await arena.grantRole(await arena.OPERATOR_ROLE(), admin.address);

      // The receiver re-enters refundRun; the guard reverts, taking the whole
      // outer call with it, so no double refund is possible.
      await expect(arena.refundRun(id)).to.be.reverted;
      expect((await arena.getRun(id)).state).to.equal(1n); // still ENTERED
    });
  });
});

describe('ElementalRewards', () => {
  it('refuses two mints for the same run id', async () => {
    const { rewards, admin, player } = await deployFixture();
    await rewards.grantRole(await rewards.MINTER_ROLE(), admin.address);
    const id = ethers.id('one-run');

    await rewards.mintReward(player.address, 5, id, 'ipfs://a');
    await expect(
      rewards.mintReward(player.address, 5, id, 'ipfs://a')
    ).to.be.revertedWithCustomError(rewards, 'RunAlreadyMinted');
  });

  it('refuses minting from a non-minter', async () => {
    const { rewards, outsider, player } = await deployFixture();
    await expect(
      rewards.connect(outsider).mintReward(player.address, 1, ethers.id('x'), 'ipfs://a')
    ).to.be.revertedWithCustomError(rewards, 'Unauthorized');
  });

  it('rejects reward levels outside 1-15', async () => {
    const { rewards, admin, player } = await deployFixture();
    await rewards.grantRole(await rewards.MINTER_ROLE(), admin.address);
    await expect(
      rewards.mintReward(player.address, 16, ethers.id('hi'), 'ipfs://a')
    ).to.be.revertedWithCustomError(rewards, 'InvalidRewardLevel');
  });

  it('reports ERC-721 interface support', async () => {
    const { rewards } = await deployFixture();
    expect(await rewards.supportsInterface('0x80ac58cd')).to.equal(true);
    expect(await rewards.supportsInterface('0x5b5e139f')).to.equal(true);
  });

  it('transfers a token to a new owner', async () => {
    const { rewards, admin, player, outsider } = await deployFixture();
    await rewards.grantRole(await rewards.MINTER_ROLE(), admin.address);
    await rewards.mintReward(player.address, 2, ethers.id('transfer'), 'ipfs://a');

    await rewards.connect(player).transferFrom(player.address, outsider.address, 1);
    expect(await rewards.ownerOf(1)).to.equal(outsider.address);
    expect(await rewards.balanceOf(player.address)).to.equal(0n);
  });
});
