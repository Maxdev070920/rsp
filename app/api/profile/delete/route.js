import { withApi } from '@/lib/security/apiHandler';
import { requireActor } from '@/lib/auth/session';
import { getRepository } from '@/lib/database/repository';
import { deletionSchema, parseBody } from '@/lib/security/validation';
import { AUDIT_EVENTS, audit, ipFrom } from '@/lib/security/audit';
import { createSupabaseAdminClient } from '@/lib/database/supabaseClients';

export const dynamic = 'force-dynamic';

/**
 * Account deletion.
 *
 * Off-chain identity is anonymised (display name, email, avatar, linked
 * wallets). Run and round records are retained in anonymised form because they
 * back the leaderboard and the audit trail. On-chain records — entry
 * transactions, mints, transfers, current NFT ownership — are outside this
 * system entirely and cannot be deleted by anyone; the response says so
 * explicitly so the UI can repeat it to the player.
 */
export const POST = withApi(
  async ({ request, body }) => {
    const { reason } = parseBody(deletionSchema, body);
    const actor = await requireActor();
    const repo = getRepository();

    const requestRecord = await repo.createDeletionRequest({ userId: actor.userId, reason });
    await audit(AUDIT_EVENTS.ACCOUNT_DELETION_REQUESTED, {
      userId: actor.userId,
      ip: ipFrom(request),
      metadata: { requestId: requestRecord.id },
    });

    await repo.deleteProfile(actor.userId, { anonymize: true });

    // Removing the auth user needs the service role; without it the profile is
    // anonymised and the request stays pending for an operator to finish.
    const admin = createSupabaseAdminClient();
    let authDeleted = false;
    if (admin && !actor.isGuest) {
      const { error } = await admin.auth.admin.deleteUser(actor.userId);
      authDeleted = !error;
    }

    await repo.completeDeletionRequest(requestRecord.id);
    await audit(AUDIT_EVENTS.ACCOUNT_DELETED, {
      userId: actor.userId,
      ip: ipFrom(request),
      metadata: { authDeleted },
    });

    return {
      deleted: true,
      authDeleted,
      retained: {
        anonymisedGameRecords: 'Run and round history is kept without identifying details for leaderboard integrity and audit.',
        auditLogs: 'Security audit entries are retained for a limited period as required for abuse investigation.',
        blockchain:
          'Any on-chain transaction, minted NFT, or transfer is recorded on a public blockchain. It is not held by this service and cannot be deleted or altered by us or by you.',
      },
    };
  },
  { name: 'account-delete', limit: 5, windowMs: 60 * 60 * 1000 }
);
