import { withApi } from '@/lib/security/apiHandler';
import { parseBody, walletVerifySchema } from '@/lib/security/validation';
import { requireActor } from '@/lib/auth/session';
import { verifyWalletSignature } from '@/lib/auth/walletAuth';
import { getRepository } from '@/lib/database/repository';
import { AUDIT_EVENTS, audit, ipFrom } from '@/lib/security/audit';
import { AppError } from '@/lib/security/errors';
import { getChain } from '@/config/chains';
import { publicEnv } from '@/config/env';

export const dynamic = 'force-dynamic';

/**
 * Verifies the signature and links the wallet to the *account*, not the other
 * way round. Changing wallets never costs a player their account, because
 * identity lives in the profile row and wallets are attachments to it.
 */
export const POST = withApi(
  async ({ request, body }) => {
    const input = parseBody(walletVerifySchema, body);
    const actor = await requireActor({ createGuest: true });

    const chain = getChain(input.chainId);
    if (!chain) throw new AppError('Unsupported network.', { code: 'UNSUPPORTED_CHAIN', status: 400 });
    if (!chain.testnet && !publicEnv.allowMainnet) {
      throw new AppError(
        'Mainnet is disabled in this deployment. Switch your wallet to a testnet.',
        { code: 'MAINNET_DISABLED', status: 400 }
      );
    }

    const result = await verifyWalletSignature(input);
    if (!result.ok) {
      await audit(AUDIT_EVENTS.WALLET_SIGNATURE_REJECTED, {
        userId: actor.userId,
        ip: ipFrom(request),
        metadata: { reason: result.reason },
      });
      throw new AppError('Wallet signature could not be verified. Request a new challenge and try again.', {
        code: 'SIGNATURE_REJECTED',
        status: 401,
      });
    }

    const repo = getRepository();
    const existing = await repo.findWalletByAddress(result.address);
    if (existing && existing.user_id !== actor.userId) {
      throw new AppError('That wallet is already linked to another account.', {
        code: 'WALLET_ALREADY_LINKED',
        status: 409,
      });
    }

    const wallets = await repo.listWallets(actor.userId);
    const wallet =
      existing ||
      (await repo.linkWallet({
        userId: actor.userId,
        address: result.address,
        chainId: result.chainId,
        isPrimary: wallets.length === 0,
      }));

    await audit(AUDIT_EVENTS.WALLET_LINKED, {
      userId: actor.userId,
      ip: ipFrom(request),
      metadata: { address: result.address, chainId: result.chainId },
    });

    return { wallet, wallets: await repo.listWallets(actor.userId) };
  },
  { name: 'wallet-verify', limit: 20 }
);
