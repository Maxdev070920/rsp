import { withApi } from '@/lib/security/apiHandler';
import { getActor, requireActor } from '@/lib/auth/session';
import { getRepository } from '@/lib/database/repository';
import { parseBody, profileSchema } from '@/lib/security/validation';
import { AUDIT_EVENTS, audit, ipFrom } from '@/lib/security/audit';
import { getPlayerRank } from '@/services/leaderboardService';

export const dynamic = 'force-dynamic';

export const GET = withApi(
  async () => {
    const actor = await getActor();
    if (!actor) return { profile: null };
    const repo = getRepository();
    const [wallets, earned, runs, rank] = await Promise.all([
      repo.listWallets(actor.userId),
      repo.listEarnedRewards({ userId: actor.userId }),
      repo.listRuns({ userId: actor.userId, limit: 10 }),
      getPlayerRank({ userId: actor.userId }),
    ]);

    const stats = runs.reduce(
      (acc, run) => ({
        runs: acc.runs + 1,
        wins: acc.wins + run.wins,
        losses: acc.losses + run.losses,
        ties: acc.ties + run.ties,
        bestLevel: Math.max(acc.bestLevel, run.claimedLevel ?? run.level),
      }),
      { runs: 0, wins: 0, losses: 0, ties: 0, bestLevel: 0 }
    );

    return {
      profile: actor.profile,
      session: { userId: actor.userId, isGuest: actor.isGuest, email: actor.email },
      wallets,
      earnedCount: earned.length,
      recentRuns: runs,
      rank,
      stats,
    };
  },
  { name: 'profile-get', limit: 120 }
);

export const PATCH = withApi(
  async ({ request, body }) => {
    const input = parseBody(profileSchema, body);
    const actor = await requireActor();
    const profile = await getRepository().upsertProfile({
      id: actor.userId,
      display_name: input.displayName,
      champion_key: input.championKey,
      avatar_seed: input.avatarSeed,
      is_guest: actor.isGuest,
    });
    await audit(AUDIT_EVENTS.PROFILE_UPDATED, { userId: actor.userId, ip: ipFrom(request) });
    return { profile };
  },
  { name: 'profile-patch', limit: 30 }
);
