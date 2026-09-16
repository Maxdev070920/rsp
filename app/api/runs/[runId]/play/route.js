import { z } from 'zod';
import { withApi } from '@/lib/security/apiHandler';
import { parseBody, playRoundSchema, uuidSchema } from '@/lib/security/validation';
import { requireActor } from '@/lib/auth/session';
import { playRound } from '@/services/runService';
import { ipFrom } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

export const POST = withApi(
  async ({ request, context, body }) => {
    const { runId } = await context.params;
    parseBody(z.object({ runId: uuidSchema }), { runId });
    const { move, expectedRoundNumber } = parseBody(playRoundSchema, body);
    const actor = await requireActor();
    return playRound({ actor, runId, move, expectedRoundNumber, ip: ipFrom(request) });
  },
  { name: 'run-play', limit: 180 }
);
