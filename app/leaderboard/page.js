'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { GAME_ROOMS } from '@/config/rooms';

export default function LeaderboardPage() {
  const [scope, setScope] = useState('season');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Deliberate: clearing then refetching when the scope tab changes is the
    // loading state, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    api
      .get(`/api/leaderboard?scope=${scope}&limit=100`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [scope]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-white sm:text-4xl">Leaderboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Score is the triangular sum of the levels you claim, multiplied by the arena&rsquo;s multiplier. Deeper runs
            compound; Practice Arena never scores.
          </p>
        </div>
        <div role="tablist" aria-label="Leaderboard scope" className="panel flex gap-1 p-1">
          {[
            ['season', 'Seasonal'],
            ['global', 'Global'],
          ].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={scope === key}
              onClick={() => setScope(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                scope === key ? 'bg-nebula/25 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {data?.season && scope === 'season' && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-eyebrow">Current season</p>
              <p className="font-display text-lg font-bold text-white">{data.season.name}</p>
            </div>
            <p className="text-xs text-slate-400">
              {new Date(data.season.startsAt).toLocaleDateString()} – {new Date(data.season.endsAt).toLocaleDateString()}
            </p>
          </div>
        </Card>
      )}

      {data?.me && (
        <Card className="mb-5 border-nebula/50">
          <p className="label-eyebrow">Your position</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Rank', `#${data.me.rank} of ${data.me.total}`],
              ['Score', data.me.score.toLocaleString()],
              ['Best level', data.me.highest_level],
              ['Longest streak', data.me.longest_streak],
              ['NFTs', data.me.nfts_collected],
            ].map(([label, value]) => (
              <div key={label} className="panel-inset px-3 py-2">
                <p className="label-eyebrow">{label}</p>
                <p className="font-display text-base font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && <EmptyState icon="⚠" title="Could not load the leaderboard" description={error} />}

      {!data && !error && (
        <div className="flex justify-center py-20">
          <Spinner label="Loading rankings…" />
        </div>
      )}

      {data && <LeaderboardTable entries={data.entries} highlightUserId={data.me?.user_id} />}

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-white">Room multipliers</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {GAME_ROOMS.map((room) => (
            <li key={room.key}>
              <Badge tone={room.accent}>
                {room.name}: {room.leaderboardMultiplier === 0 ? 'unranked' : `${room.leaderboardMultiplier}×`}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
