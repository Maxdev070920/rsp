import { withApi } from '@/lib/security/apiHandler';
import { parseBody, walletNonceSchema } from '@/lib/security/validation';
import { requireActor } from '@/lib/auth/session';
import { buildSignInMessage, issueNonce } from '@/lib/auth/walletAuth';
import { AUDIT_EVENTS, audit, ipFrom } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/** Issues the challenge the wallet must sign. Nonce is server-generated. */
export const POST = withApi(
  async ({ request, body }) => {
    const { address, chainId } = parseBody(walletNonceSchema, body);
    const actor = await requireActor({ createGuest: true });

    const { nonce, expiresAt } = await issueNonce({ address });
    const issuedAt = new Date().toISOString();
    const message = buildSignInMessage({ address, chainId, nonce, issuedAt });

    await audit(AUDIT_EVENTS.WALLET_NONCE_ISSUED, {
      userId: actor.userId,
      ip: ipFrom(request),
      metadata: { address: address.toLowerCase(), chainId },
    });

    return { nonce, message, issuedAt, expiresAt };
  },
  { name: 'wallet-nonce', limit: 20 }
);
