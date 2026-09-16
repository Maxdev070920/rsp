import { getRepository } from '@/lib/database/repository';
import { getRoom } from '@/config/rooms';
import { CURRENT_SEASON } from '@/lib/database/demoData';

/**
 * Score model.
 *
 * A claimed run is worth the triangular sum of its levels, so depth compounds
 * (level 10 is worth far more than two level-5 runs), multiplied by the room's
 * leaderboard multiplier. Practice has multiplier 0 and therefore never scores,
 * which is what stops free runs from inflating the board.
 *
 * Scoring is computed here, on the server, from the persisted run — never from
 * a client-supplied total.
 */
export function scoreForRun({ roomKey, level, claimed }) {
  const room = getRoom(roomKey);
  if (!room || room.leaderboardMultiplier === 0) return 0;
  if (!claimed || level < 1) return 0;
  const triangular = (level * (level + 1)) / 2;
  return Math.round(triangular * 50 * room.leaderboardMultiplier);
}

export async function recordRunResult({ run, claimed, nftMinted = false, displayName }) {
  const room = getRoom(run.roomKey);
  if (!room || room.leaderboardMultiplier === 0) return null;

  const score = scoreForRun({ roomKey: run.roomKey, level: run.claimedLevel ?? run.level, claimed });
  return getRepository().upsertLeaderboardEntry({
    userId: run.userId,
    seasonId: CURRENT_SEASON.id,
    displayName,
    patch: {
      scoreDelta: score,
      winsDelta: run.wins,
      runsDelta: 1,
      nftsDelta: nftMinted ? 1 : 0,
      streak: run.streak,
      level: run.claimedLevel ?? run.level,
    },
  });
}

export async function getLeaderboard({ seasonId = CURRENT_SEASON.id, limit = 100, scope = 'season' } = {}) {
  const repo = getRepository();
  const entries = await repo.listLeaderboard({
    seasonId: scope === 'global' ? null : seasonId,
    limit,
  });

  // Global view merges a player's per-season rows into one aggregate.
  const merged =
    scope === 'global'
      ? Object.values(
          entries.reduce((acc, entry) => {
            const current = acc[entry.user_id] || { ...entry, score: 0, total_runs: 0, total_wins: 0, nfts_collected: 0 };
            acc[entry.user_id] = {
              ...current,
              score: current.score + entry.score,
              total_runs: current.total_runs + entry.total_runs,
              total_wins: current.total_wins + entry.total_wins,
              nfts_collected: current.nfts_collected + entry.nfts_collected,
              longest_streak: Math.max(current.longest_streak, entry.longest_streak),
              highest_level: Math.max(current.highest_level, entry.highest_level),
            };
            return acc;
          }, {})
        ).sort((a, b) => b.score - a.score)
      : entries;

  return merged.slice(0, limit).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function getPlayerRank({ userId, seasonId = CURRENT_SEASON.id }) {
  const board = await getLeaderboard({ seasonId, limit: 1000 });
  const entry = board.find((row) => row.user_id === userId);
  return entry ? { ...entry, total: board.length } : null;
}

export { CURRENT_SEASON };
