'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/apiClient';
import RunHistoryCard from '@/components/game/RunHistoryCard';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import { GAME_ROOMS } from '@/config/rooms';

export default function HistoryClient() {
  const params = useSearchParams();
  const focusRunId = params.get('run');

  const [runs, setRuns] = useState(null);
  const [error, setError] = useState(null);
  const [roomFilter, setRoomFilter] = useState('all');

  useEffect(() => {
    api
      .get('/api/history')
      .then((data) => setRuns(data.runs))
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(
    () => (runs || []).filter((run) => roomFilter === 'all' || run.roomKey === roomFilter),
    [runs, roomFilter]
  );

  const totals = useMemo(() => {
    if (!runs) return null;
    return runs.reduce(
      (acc, run) => ({
        runs: acc.runs + 1,
        wins: acc.wins + run.wins,
        losses: acc.losses + run.losses,
        ties: acc.ties + run.ties,
        claimed: acc.claimed + (run.status === 'CLAIMED' ? 1 : 0),
        best: Math.max(acc.best, run.claimedLevel ?? run.level),
      }),
      { runs: 0, wins: 0, losses: 0, ties: 0, claimed: 0, best: 0 }
    );
  }, [runs]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-black text-white sm:text-4xl">Game history</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Every run, every throw, and the randomness proof behind it. Finished runs publish their seed so you can
          recompute the opponent&rsquo;s moves yourself.
        </p>
        {totals && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="nebula">{totals.runs} runs</Badge>
            <Badge tone="success">{totals.claimed} claimed</Badge>
            <Badge tone="aurora">{totals.wins} resolved wins</Badge>
            <Badge tone="ember">{totals.ties} ties replayed</Badge>
            <Badge>Best level {totals.best}</Badge>
          </div>
        )}
      </header>

      <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="history-room" className="label-eyebrow block">
            Arena
          </label>
          <select
            id="history-room"
            value={roomFilter}
            onChange={(event) => setRoomFilter(event.target.value)}
            className="mt-1 rounded-lg border border-arena-edge bg-arena-deep px-3 py-2 text-sm text-slate-200"
          >
            <option value="all">All arenas</option>
            {GAME_ROOMS.map((room) => (
              <option key={room.key} value={room.key}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <EmptyState icon="⚠" title="Could not load your history" description={error} />}

      {!runs && !error && (
        <div className="flex justify-center py-20">
          <Spinner label="Loading history…" />
        </div>
      )}

      {runs && filtered.length === 0 && (
        <EmptyState
          icon="🗒"
          title="No runs yet"
          description="Play a run in Practice Arena and it will appear here, complete with its randomness proof."
          actionLabel="Start a free run"
          actionHref="/game?room=practice"
        />
      )}

      <div className="space-y-3">
        {filtered.map((run) => (
          <RunHistoryCard key={run.id} run={run} defaultOpen={run.id === focusRunId} />
        ))}
      </div>
    </div>
  );
}
