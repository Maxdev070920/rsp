'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import RoomCard from '@/components/game/RoomCard';
import EntryConfirmDialog from '@/components/game/EntryConfirmDialog';
import ChampionPicker from '@/components/game/ChampionPicker';
import ModeBadge from '@/components/layout/ModeBadge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { DEFAULT_CHAMPION } from '@/config/characters';
import useSession from '@/hooks/useSession';
import useToast from '@/hooks/useToast';

export default function RoomsPage() {
  const router = useRouter();
  const toast = useToast();
  const { session, startGuest } = useSession();

  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [champion, setChampion] = useState(DEFAULT_CHAMPION);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/api/rooms')
      .then((data) => setRooms(data.rooms))
      .catch((err) => setError(err.message));
  }, [session]);

  const confirmEntry = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (!session) await startGuest();
      router.push(`/game?room=${pending.key}&champion=${champion}`);
    } catch (err) {
      toast.error('Could not enter', err.message);
      setBusy(false);
    }
  }, [pending, session, startGuest, router, champion, toast]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="label-eyebrow">Step 1 of 2</p>
        <h1 className="font-display text-3xl font-black text-white sm:text-4xl">Choose your arena</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Every arena runs the identical ladder and identical odds. What changes is the entry fee, the artwork tier of
          what you mint, and how much your run is worth on the leaderboard.
        </p>
        <div className="mt-4">
          <ModeBadge detailed />
        </div>
      </header>

      <section className="mb-8">
        <ChampionPicker value={champion} onChange={setChampion} />
      </section>

      {error && (
        <EmptyState
          icon="⚠"
          title="Could not load arenas"
          description={error}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      )}

      {!rooms && !error && (
        <div className="flex justify-center py-16">
          <Spinner label="Loading arenas…" />
        </div>
      )}

      {rooms && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rooms.map((room) => (
            <RoomCard key={room.key} room={room} onEnter={setPending} busy={busy && pending?.key === room.key} />
          ))}
        </div>
      )}

      <EntryConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        room={pending}
        quote={pending?.quote}
        onConfirm={confirmEntry}
        busy={busy}
      />
    </div>
  );
}
