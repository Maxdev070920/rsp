import { withApi } from '@/lib/security/apiHandler';
import { GAME_ROOMS } from '@/config/rooms';
import { quoteRoom } from '@/services/runService';
import { getActor } from '@/lib/auth/session';
import { getRepository } from '@/lib/database/repository';
import { isBlockchainMode } from '@/config/env';

export const dynamic = 'force-dynamic';

/**
 * Room list with per-player eligibility. Fees are always served from the
 * server's configuration so the client can never present its own numbers.
 */
export const GET = withApi(
  async () => {
    const actor = await getActor();
    const wallets = actor ? await getRepository().listWallets(actor.userId) : [];

    const rooms = GAME_ROOMS.map((room) => {
      const quote = quoteRoom(room.key);
      const needsWallet = room.requiresWallet && isBlockchainMode;
      const needsAccount = needsWallet && (!actor || actor.isGuest);
      return {
        ...room,
        quote,
        eligibility: {
          eligible: !needsAccount && (!needsWallet || wallets.length > 0),
          needsAccount,
          needsWallet: needsWallet && wallets.length === 0,
          reason: needsAccount
            ? 'Create an account to enter paid arenas.'
            : needsWallet && wallets.length === 0
              ? 'Link a wallet to enter this arena.'
              : null,
        },
      };
    });

    return { rooms, mode: isBlockchainMode ? 'blockchain' : 'demo' };
  },
  { name: 'rooms', limit: 120 }
);
