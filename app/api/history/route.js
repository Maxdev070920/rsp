import { withApi } from '@/lib/security/apiHandler';
import { requireActor } from '@/lib/auth/session';
import { listRunHistory } from '@/services/runService';

export const dynamic = 'force-dynamic';

export const GET = withApi(
  async () => {
    const actor = await requireActor();
    const runs = await listRunHistory({ actor });
    return { runs };
  },
  { name: 'history', limit: 60 }
);
