/**
 * Achievements are derived from persisted stats rather than stored as their own
 * rows, so they can be added or retuned without a migration.
 */
export const ACHIEVEMENTS = [
  { key: 'first-run', name: 'First Contact', description: 'Finish your first run.', test: (s) => s.runs >= 1 },
  { key: 'first-claim', name: 'Banked It', description: 'Claim a reward for the first time.', test: (s) => s.claimed >= 1 },
  { key: 'tie-breaker', name: 'Deadlock', description: 'Replay five ties across your runs.', test: (s) => s.ties >= 5 },
  { key: 'level-5', name: 'Refined', description: 'Reach reward level 5.', test: (s) => s.bestLevel >= 5 },
  { key: 'level-10', name: 'Mythic Reach', description: 'Reach reward level 10.', test: (s) => s.bestLevel >= 10 },
  { key: 'level-15', name: 'Eternal', description: 'Reach reward level 15 and auto-claim the Singularity.', test: (s) => s.bestLevel >= 15 },
  { key: 'streak-7', name: 'Unbroken', description: 'Win seven resolved rounds in a row.', test: (s) => s.longestStreak >= 7 },
  { key: 'collector-5', name: 'Curator', description: 'Earn five different reward tiers.', test: (s) => s.distinctTiers >= 5 },
  { key: 'veteran-25', name: 'Arena Veteran', description: 'Complete twenty-five runs.', test: (s) => s.runs >= 25 },
  { key: 'disciplined', name: 'Discipline', description: 'Claim ten rewards without losing a run in between.', test: (s) => s.claimed >= 10 },
];

export function evaluateAchievements(stats) {
  const safe = {
    runs: 0,
    claimed: 0,
    ties: 0,
    bestLevel: 0,
    longestStreak: 0,
    distinctTiers: 0,
    ...stats,
  };
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: Boolean(achievement.test(safe)),
  }));
}
