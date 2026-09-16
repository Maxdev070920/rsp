import { z } from 'zod';
import { withApi } from '@/lib/security/apiHandler';
import { parseBody, uuidSchema } from '@/lib/security/validation';
import { requireActor } from '@/lib/auth/session';
import { confirmRunEntry } from '@/services/runService';
import { ipFrom } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

const entrySchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash.'),
});

/** Confirms an on-chain entry payment. The receipt is verified server-side. */
export const POST = withApi(
  async ({ request, context, body }) => {
    const { runId } = await context.params;
    parseBody(z.object({ runId: uuidSchema }), { runId });
    const { txHash } = parseBody(entrySchema, body);
    const actor = await requireActor();
    return confirmRunEntry({ actor, runId, txHash, ip: ipFrom(request) });
  },
  { name: 'run-entry', limit: 30 }
);
