'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import RoundStage from '@/components/game/RoundStage';
import MoveButtons from '@/components/game/MoveButtons';
import DecisionPanel from '@/components/game/DecisionPanel';
import RewardLadder from '@/components/game/RewardLadder';
import OddsPanel from '@/components/game/OddsPanel';
import RunSummary from '@/components/game/RunSummary';
import EntryConfirmDialog from '@/components/game/EntryConfirmDialog';
import ChampionPicker from '@/components/game/ChampionPicker';
import { getChampion, DEFAULT_CHAMPION } from '@/config/characters';
import { PRACTICE_ROOM_KEY } from '@/config/rooms';
import useGameRun from '@/hooks/useGameRun';
import useSession from '@/hooks/useSession';
import useToast from '@/hooks/useToast';

export default function GameClient() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { session, startGuest } = useSession();

  const roomKey = params.get('room') || PRACTICE_ROOM_KEY;
  const championKey = params.get('champion') || DEFAULT_CHAMPION;

  const game = useGameRun();
  const [rooms, setRooms] = useState(null);
  const [roomsError, setRoomsError] = useState(null);
  const [champion, setChampion] = useState(championKey);
  const [entryOpen, setEntryOpen] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [selectedMove, setSelectedMove] = useState(null);
  const autoStarted = useRef(false);

  const room = rooms?.find((entry) => entry.key === roomKey) || null;

  useEffect(() => {
    api
      .get('/api/rooms')
      .then((data) => setRooms(data.rooms))
      .catch((err) => setRoomsError(err.message));
  }, [session]);

  const beginRun = useCallback(
    async (selectedChampion = champion) => {
      try {
        if (!session) await startGuest();
        await game.start({ roomKey, championKey: selectedChampion });
        setEntryOpen(false);
        setSelectedMove(null);
      } catch {
        // useGameRun already surfaced a toast with the reason.
      }
    },
    [champion, game, roomKey, session, startGuest]
  );

  // Practice needs no disclosure step, so it starts straight away. Paid arenas
  // always show the fee dialog first, even on a direct link.
  useEffect(() => {
    if (!room || game.run || autoStarted.current) return;
    autoStarted.current = true;
    // Deliberate: entering the arena on arrival is the point of this route.
    // Practice starts immediately; a paid room opens the fee disclosure first.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (room.usesVirtualCredits) beginRun();
    else setEntryOpen(true);
  }, [room, game.run, beginRun]);

  const onMove = async (move) => {
    setSelectedMove(move);
    try {
      await game.play(move);
    } catch {
      /* handled in hook */
    }
  };

  const onPlayAgain = () => {
    game.reset();
    autoStarted.current = false;
    setSelectedMove(null);
    if (room?.usesVirtualCredits) beginRun();
    else setEntryOpen(true);
  };

  if (roomsError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState icon="⚠" title="Could not load the arena" description={roomsError} actionLabel="Back to arenas" actionHref="/rooms" />
      </div>
    );
  }

  if (!rooms) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Entering the arena…" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="🔍"
          title="Unknown arena"
          description={`There is no arena called "${roomKey}".`}
          actionLabel="Choose an arena"
          actionHref="/rooms"
        />
      </div>
    );
  }

  const run = game.run;
  const playerChampion = getChampion(run?.championKey || champion);
  const opponentChampion = getChampion(run?.opponentKey || 'nova');
  const awaitingEntry = run?.status === 'AWAITING_ENTRY';
  const finished = run?.isFinished;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-eyebrow">{room.name}</p>
          <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
            {finished ? 'Run complete' : run ? `Level ${run.level} of 15` : 'Preparing run'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={room.quote.mode === 'demo' ? 'ember' : 'aurora'}>
            {room.quote.mode === 'demo' ? 'Demo mode' : 'Blockchain mode'}
          </Badge>
          <Badge tone="nebula">{room.usesVirtualCredits ? 'Free entry' : `${room.entryFee} ${room.currency}`}</Badge>
          <Button href="/rooms" variant="quiet" size="sm">
            Change arena
          </Button>
        </div>
      </header>

      {!run && (
        <Card className="mb-6">
          <p className="text-sm text-slate-300">Choose a champion, then start your run.</p>
          <div className="mt-4">
            <ChampionPicker value={champion} onChange={setChampion} compact />
          </div>
          <Button className="mt-4" variant="gold" onClick={() => (room.usesVirtualCredits ? beginRun() : setEntryOpen(true))} loading={game.busy}>
            Start run
          </Button>
        </Card>
      )}

      {run && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <RoundStage
              champion={playerChampion}
              opponent={opponentChampion}
              phase={game.phase}
              lastRound={game.lastRound}
              playerMove={selectedMove}
            />

            {awaitingEntry && (
              <Card className="border-amber-500/50">
                <p className="label-eyebrow">Entry payment required</p>
                <p className="mt-1 text-sm text-slate-300">
                  Send {run.entryFee} {run.currency} to the arena contract from your linked wallet, then paste the
                  transaction hash. The server verifies the receipt before the run starts — the hash alone is not enough.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label className="flex-1">
                    <span className="sr-only">Entry transaction hash</span>
                    <input
                      value={txHash}
                      onChange={(event) => setTxHash(event.target.value.trim())}
                      placeholder="0x…"
                      className="w-full rounded-xl border border-arena-edge bg-arena-deep px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600"
                    />
                  </label>
                  <Button onClick={() => game.confirmEntry(txHash).catch(() => {})} loading={game.busy} disabled={!txHash}>
                    Verify entry
                  </Button>
                </div>
              </Card>
            )}

            {finished && game.settlement && (
              <RunSummary run={run} settlement={game.settlement} room={room} onPlayAgain={onPlayAgain} />
            )}

            {!finished && run.canDecide && (
              <DecisionPanel
                run={run}
                room={room}
                busy={game.busy}
                onClaim={() => game.decide('claim').catch(() => {})}
                onContinue={() => game.decide('continue').catch(() => {})}
              />
            )}

            {!finished && run.canPlay && (
              <Card>
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="label-eyebrow">Your throw</p>
                  <p className="text-xs text-slate-500">Press 1, 2, or 3</p>
                </div>
                <MoveButtons onSelect={onMove} disabled={game.busy || game.phase === 'throwing'} selected={selectedMove} />
                {game.phase === 'throwing' && (
                  <p className="mt-3 text-center text-xs text-slate-400" role="status">
                    Waiting for the server to resolve this round…
                  </p>
                )}
              </Card>
            )}

            {game.error && (
              <div role="alert" className="rounded-xl border border-rose-500/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-1 text-xs">{game.error}</p>
                <Button size="sm" variant="ghost" className="mt-2" onClick={onPlayAgain}>
                  Start a fresh run
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <RewardLadder level={run.level} atRisk={run.canDecide} />
            <OddsPanel run={run} room={room} quote={room.quote} randomness={game.randomness} />
            {game.rounds.length > 0 && (
              <Card>
                <p className="label-eyebrow mb-2">This run</p>
                <ol className="space-y-1 text-xs">
                  {game.rounds
                    .slice()
                    .reverse()
                    .map((round) => (
                      <li key={round.roundNumber} className="panel-inset flex items-center justify-between px-3 py-1.5">
                        <span className="text-slate-400">R{round.roundNumber}</span>
                        <span className="text-slate-300">
                          {round.playerMove} vs {round.opponentMove}
                        </span>
                        <span
                          className={
                            round.outcome === 'win'
                              ? 'text-emerald-300'
                              : round.outcome === 'loss'
                                ? 'text-rose-300'
                                : 'text-amber-300'
                          }
                        >
                          {round.outcome}
                        </span>
                      </li>
                    ))}
                </ol>
              </Card>
            )}
          </aside>
        </div>
      )}

      <EntryConfirmDialog
        open={entryOpen}
        onClose={() => {
          setEntryOpen(false);
          if (!game.run) router.push('/rooms');
        }}
        room={room}
        quote={room.quote}
        busy={game.busy}
        onConfirm={() => beginRun()}
      />
    </div>
  );
}
