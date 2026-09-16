import { withApi } from '@/lib/security/apiHandler';
import { getActor } from '@/lib/auth/session';
import { getRepository } from '@/lib/database/repository';
import { REWARD_DEFINITIONS } from '@/config/rewards';

export const dynamic = 'force-dynamic';

/**
 * Returns every reward definition merged with what this player has earned, so
 * the collection page can render locked and unlocked states from one payload.
 */
export const GET = withApi(
  async () => {
    const actor = await getActor();
    if (!actor) {
      return { rewards: REWARD_DEFINITIONS.map((r) => ({ definition: r, earned: [] })), earnedCount: 0 };
    }

    const repo = getRepository();
    const earned = await repo.listEarnedRewards({ userId: actor.userId });
    const mints = await repo.listMints(actor.userId);
    const mintByReward = new Map(mints.map((m) => [m.earned_reward_id, m]));

    const rewards = REWARD_DEFINITIONS.map((definition) => ({
      definition,
      earned: earned
        .filter((e) => e.reward_level === definition.level)
        .map((e) => ({ ...e, mint: mintByReward.get(e.id) || null })),
    }));

    return { rewards, earnedCount: earned.length, totalMints: mints.length };
  },
  { name: 'collection', limit: 120 }
);
