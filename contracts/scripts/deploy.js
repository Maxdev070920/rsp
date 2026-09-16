const hre = require('hardhat');

/**
 * Deploys the rewards NFT and the arena, wires them together, and seeds the
 * room entry fees from environment configuration.
 *
 * Fees come from the same environment variables the web app reads, so the two
 * cannot drift apart.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  if (network.chainId === 2020n || network.chainId === 1n) {
    throw new Error('Refusing to deploy to mainnet from this script.');
  }

  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  console.log(`Deploying with ${deployer.address} on chain ${network.chainId}`);
  console.log(`Treasury: ${treasury}`);

  const Rewards = await hre.ethers.getContractFactory('ElementalRewards');
  const rewards = await Rewards.deploy(deployer.address);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log(`ElementalRewards: ${rewardsAddress}`);

  const Arena = await hre.ethers.getContractFactory('ElementalArena');
  const arena = await Arena.deploy(deployer.address, treasury);
  await arena.waitForDeployment();
  const arenaAddress = await arena.getAddress();
  console.log(`ElementalArena:   ${arenaAddress}`);

  await (await arena.setRewardsContract(rewardsAddress)).wait();
  await (await rewards.grantRole(await rewards.MINTER_ROLE(), arenaAddress)).wait();

  // The game server address that is allowed to settle runs.
  const settler = process.env.SETTLER_ADDRESS || deployer.address;
  await (await arena.grantRole(await arena.SETTLER_ROLE(), settler)).wait();
  console.log(`Settler role granted to: ${settler}`);

  const fees = {
    bronze: process.env.NEXT_PUBLIC_ENTRY_FEE_BRONZE || '0.01',
    silver: process.env.NEXT_PUBLIC_ENTRY_FEE_SILVER || '0.05',
    legendary: process.env.NEXT_PUBLIC_ENTRY_FEE_LEGENDARY || '0.1',
  };

  for (const [roomKey, fee] of Object.entries(fees)) {
    const key = hre.ethers.id(roomKey);
    await (await arena.setEntryFee(key, hre.ethers.parseEther(fee))).wait();
    console.log(`Entry fee ${roomKey}: ${fee}`);
  }

  console.log('\nAdd these to .env.local:');
  console.log(`NEXT_PUBLIC_ARENA_CONTRACT_ADDRESS=${arenaAddress}`);
  console.log(`NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS=${rewardsAddress}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${network.chainId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
