import { withApi } from '@/lib/security/apiHandler';
import { getActor } from '@/lib/auth/session';
import { getRepository } from '@/lib/database/repository';
import { AUDIT_EVENTS, audit, ipFrom } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

const shape = (actor) =>
  actor && {
    userId: actor.userId,
    isGuest: actor.isGuest,
    email: actor.email,
    emailVerified: actor.emailVerified,
    profile: actor.profile,
  };

export const GET = withApi(
  async () => {
    const actor = await getActor();
    if (!actor) return { session: null };
    const wallets = await getRepository().listWallets(actor.userId);
    return { session: shape(actor), wallets };
  },
  { name: 'session-get', limit: 120 }
);

/** Starts (or reuses) a guest session. Never elevates an existing account. */
export const POST = withApi(
  async ({ request }) => {
    const existing = await getActor();
    if (existing) return { session: shape(existing), created: false };

    const actor = await getActor({ createGuest: true });
    await audit(AUDIT_EVENTS.GUEST_SESSION_STARTED, { userId: actor.userId, ip: ipFrom(request) });
    return { session: shape(actor), created: true };
  },
  { name: 'session-post', limit: 20 }
);
