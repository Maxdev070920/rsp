/**
 * Demo leaderboard used only by the in-memory backend (no Supabase configured).
 * All names are invented; nothing here represents a real player.
 */
export const CURRENT_SEASON = {
  id: 'season-1',
  name: 'Season 1 — First Ignition',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T23:59:59.000Z',
};

const RAW = [
  ['Kestrel_Void', 'legendary', 14, 12, 14, 9, 48210],
  ['NullPointer', 'legendary', 13, 31, 13, 21, 41905],
  ['Saltmarsh', 'silver', 13, 44, 13, 27, 33140],
  ['ArcWelder', 'legendary', 12, 19, 12, 11, 29870],
  ['Tessellate', 'silver', 12, 52, 12, 30, 24115],
  ['Quietstorm', 'silver', 11, 38, 11, 22, 19630],
  ['GraniteHeart', 'bronze', 12, 71, 12, 41, 16480],
  ['Lumen_04', 'bronze', 11, 63, 11, 35, 13205],
  ['PaperTiger', 'silver', 10, 29, 10, 16, 11090],
  ['Halfstep', 'bronze', 10, 58, 10, 31, 9455],
  ['Orrery', 'bronze', 9, 47, 9, 24, 7320],
  ['Deadlift', 'legendary', 9, 8, 9, 5, 6810],
  ['MossAgate', 'bronze', 9, 40, 9, 19, 5240],
  ['Ferrous', 'silver', 8, 33, 8, 17, 4180],
  ['Windowseat', 'bronze', 8, 51, 8, 22, 3605],
  ['Cassowary', 'bronze', 7, 44, 7, 18, 2740],
  ['Hexadecimal', 'silver', 7, 25, 7, 12, 2310],
  ['Spool', 'bronze', 6, 36, 6, 14, 1620],
  ['Tarpit', 'bronze', 6, 30, 6, 11, 1245],
  ['Ninepin', 'bronze', 5, 22, 5, 8, 870],
];

export const DEMO_LEADERBOARD = RAW.map(([name, room, level, runs, streak, nfts, score], index) => ({
  user_id: `demo-${index + 1}`,
  season_id: CURRENT_SEASON.id,
  display_name: name,
  favourite_room: room,
  highest_level: level,
  total_runs: runs,
  total_wins: Math.round(runs * 1.9),
  longest_streak: streak,
  nfts_collected: nfts,
  score,
  is_demo: true,
}));
