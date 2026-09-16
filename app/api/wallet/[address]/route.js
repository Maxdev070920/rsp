import { withApi } from '@/lib/security/apiHandler';
import { requireActor } from '@/lib/auth/session';
import { getRepository } from '@/lib/database/repository';
import { AUDIT_EVENTS, audit, ipFrom } from '@/lib/security/audit';
import { AppError } from '@/lib/security/errors';

export const dynamic = 'force-dynamic';

export const DELETE = withApi(
  async ({ request, context }) => {
    const { address } = await context.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new AppError('Invalid wallet address.', { code: 'BAD_ADDRESS', status: 400 });
    }
    const actor = await requireActor();
    const removed = await getRepository().unlinkWallet({ userId: actor.userId, address });
    if (!removed) throw new AppError('That wallet is not linked to your account.', { code: 'NOT_FOUND', status: 404 });

    await audit(AUDIT_EVENTS.WALLET_UNLINKED, {
      userId: actor.userId,
      ip: ipFrom(request),
      metadata: { address: address.toLowerCase() },
    });
    return { unlinked: true, wallets: await getRepository().listWallets(actor.userId) };
  },
  { name: 'wallet-unlink', limit: 20 }
);
