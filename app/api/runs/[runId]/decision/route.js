import { z } from 'zod';
import { withApi } from '@/lib/security/apiHandler';
import { decisionSchema, parseBody, uuidSchema } from '@/lib/security/validation';
import { requireActor } from '@/lib/auth/session';
import { decideRun } from '@/services/runService';
import { ipFrom } from '@/lib/security/audit';
import { idempotencyKey, readIdempotencyHeader, withIdempotency } from '@/lib/security/idempotency';

export const dynamic = 'force-dynamic';

export const POST = withApi(
  async ({ request, context, body }) => {
    const { runId } = await context.params;
    parseBody(z.object({ runId: uuidSchema }), { runId });
    const { decision } = parseBody(decisionSchema, body);
    const actor = await requireActor();

    if (decision !== 'claim') {
      return decideRun({ actor, runId, decision, ip: ipFrom(request) });
    }

    // Claims are replay-safe: a retried request returns the original result
    // rather than attempting a second settlement.
    const key = idempotencyKey({
      userId: actor.userId,
      action: 'claim',
      resourceId: runId,
      clientKey: readIdempotencyHeader(request),
    });
    const { result, replayed } = await withIdempotency(key, () =>
      decideRun({ actor, runId, decision, ip: ipFrom(request) })
    );
    return { ...result, replayed };
  },
  { name: 'run-decision', limit: 60 }
);
