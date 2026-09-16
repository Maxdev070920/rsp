import { withApi } from '@/lib/security/apiHandler';
import { getActor } from '@/lib/auth/session';
import { CURRENT_SEASON, getLeaderboard, getPlayerRank } from '@/services/leaderboardService';

export const dynamic = 'force-dynamic';

export const GET = withApi(
  async ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope') === 'global' ? 'global' : 'season';
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100);

    const entries = await getLeaderboard({ scope, limit });
    const actor = await getActor();
    const me = actor ? await getPlayerRank({ userId: actor.userId }) : null;

    return { entries, season: CURRENT_SEASON, scope, me };
  },
  { name: 'leaderboard', limit: 120 }
);
