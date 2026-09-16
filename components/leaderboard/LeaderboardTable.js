import Badge from '@/components/ui/Badge';
import { getRoom } from '@/config/rooms';

const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);

export default function LeaderboardTable({ entries, highlightUserId = null, compact = false }) {
  if (!entries?.length) {
    return <p className="panel px-4 py-8 text-center text-sm text-slate-400">No ranked runs yet. The board is wide open.</p>;
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">Leaderboard rankings</caption>
        <thead>
          <tr className="border-b border-arena-edge/70 text-[11px] uppercase tracking-wider text-slate-400">
            <th scope="col" className="px-4 py-3">Rank</th>
            <th scope="col" className="px-4 py-3">Player</th>
            <th scope="col" className="px-4 py-3 text-right">Score</th>
            <th scope="col" className="px-4 py-3 text-right">Best level</th>
            {!compact && (
              <>
                <th scope="col" className="px-4 py-3 text-right">Wins</th>
                <th scope="col" className="px-4 py-3 text-right">Longest streak</th>
                <th scope="col" className="px-4 py-3 text-right">NFTs</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMe = highlightUserId && entry.user_id === highlightUserId;
            const room = entry.favourite_room ? getRoom(entry.favourite_room) : null;
            return (
              <tr
                key={`${entry.user_id}-${entry.season_id}`}
                className={`border-b border-arena-edge/30 last:border-0 ${isMe ? 'bg-nebula/10' : ''}`}
              >
                <td className="px-4 py-3 font-display font-bold text-slate-300">
                  {medal(entry.rank) || entry.rank}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-white">{entry.display_name}</span>
                  {isMe && <Badge tone="nebula" className="ml-2">You</Badge>}
                  {room && !compact && (
                    <span className="ml-2 text-[11px] text-slate-500">{room.name} ×{room.leaderboardMultiplier}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-ember">{entry.score.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-slate-200">{entry.highest_level}</td>
                {!compact && (
                  <>
                    <td className="px-4 py-3 text-right text-slate-300">{entry.total_wins}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{entry.longest_streak}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{entry.nfts_collected}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
