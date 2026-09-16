import { withApi } from '@/lib/security/apiHandler';
import { parseBody, createRunSchema } from '@/lib/security/validation';
import { requireActor } from '@/lib/auth/session';
import { startRun } from '@/services/runService';
import { ipFrom } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

export const POST = withApi(
  async ({ request, body }) => {
    const { roomKey, championKey } = parseBody(createRunSchema, body);
    // A guest session is created on demand so Practice Arena needs no sign-up.
    const actor = await requireActor({ createGuest: true });
    return startRun({ actor, roomKey, championKey, ip: ipFrom(request) });
  },
  { name: 'run-create', limit: 30 }
);
