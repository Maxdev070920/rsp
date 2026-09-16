import { withApi } from '@/lib/security/apiHandler';
import { requireActor } from '@/lib/auth/session';
import { getRunDetail } from '@/services/runService';
import { parseBody, uuidSchema } from '@/lib/security/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = withApi(
  async ({ context }) => {
    const { runId } = await context.params;
    parseBody(z.object({ runId: uuidSchema }), { runId });
    const actor = await requireActor();
    return getRunDetail({ actor, runId });
  },
  { name: 'run-detail', limit: 120 }
);
