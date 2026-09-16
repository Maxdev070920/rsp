import { createHash } from 'node:crypto';
import { publicEnv } from '@/config/env';
import { NftAdapter } from './adapter';

/**
 * Demo-mode minting. Produces a stable, clearly-fake token reference so the
 * collection, history, and detail modal are fully exercisable with no chain,
 * no wallet, and no credentials.
 *
 * Every field it returns is prefixed or flagged so the UI can label it as
 * simulated — it must never be presented as a real on-chain mint.
 */
export class MockNftAdapter extends NftAdapter {
  get name() {
    return 'mock-mint-v1';
  }

  get onChain() {
    return false;
  }

  async mint({ earnedRewardId, rewardLevel, runId, owner, metadataUrl }) {
    const digest = createHash('sha256').update(`${runId}:${earnedRewardId}`).digest('hex');
    return {
      status: 'SIMULATED',
      tokenId: String(BigInt(`0x${digest.slice(0, 12)}`)),
      contractAddress: publicEnv.rewardsContract || '0xSIMULATED000000000000000000000000000000',
      txHash: `0xsim${digest.slice(0, 61)}`,
      chainId: null,
      metadataUrl,
      owner: owner || null,
      rewardLevel,
      simulated: true,
      note: 'Simulated mint. No blockchain transaction was broadcast.',
    };
  }
}
