import { withApi } from '@/lib/security/apiHandler';
import { describeRepository } from '@/lib/database/repository';
import { describeRandomness } from '@/lib/random';
import { describeMinting } from '@/services/nftService';
import { isBlockchainMode, publicEnv } from '@/config/env';

export const dynamic = 'force-dynamic';

/** Surfaces which adapters are live so the UI can label demo mode honestly. */
export const GET = withApi(
  async () => ({
    mode: isBlockchainMode ? 'blockchain' : 'demo',
    chainId: publicEnv.chainId,
    allowMainnet: publicEnv.allowMainnet,
    database: describeRepository(),
    randomness: describeRandomness(),
    minting: describeMinting(),
  }),
  { name: 'health', limit: 120 }
);
