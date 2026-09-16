import { getRepository } from '@/lib/database/repository';
import { buildRewardMetadata } from '@/services/metadata';

export const dynamic = 'force-dynamic';

/**
 * Public token metadata endpoint (the hosted alternative to IPFS).
 *
 * Intentionally unauthenticated — token metadata is public by definition — but
 * it exposes only reward and run-shape data, never player identity.
 */
export async function GET(_request, context) {
  const { rewardId } = await context.params;
  const repo = getRepository();

  const mints = await repo.findMintByReward(rewardId);
  const runId = mints?.run_id;
  if (!runId) return Response.json({ error: 'Metadata not found' }, { status: 404 });

  const run = await repo.getRun(runId);
  const earned = await repo.findEarnedRewardByRun(runId);
  if (!run || !earned) return Response.json({ error: 'Metadata not found' }, { status: 404 });

  const metadata = buildRewardMetadata({
    reward: { level: earned.reward_level },
    run,
    earnedReward: earned,
  });

  return Response.json(metadata, {
    headers: { 'cache-control': 'public, max-age=300' },
  });
}
