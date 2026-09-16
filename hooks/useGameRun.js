'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import useToast from './useToast';
import useSound from './useSound';

/**
 * Drives one run against the server.
 *
 * The server is the only authority on outcomes, levels, and claims: this hook
 * never computes a result locally. It holds a short animation phase so the
 * throw plays out before the authoritative result is revealed.
 */
export default function useGameRun() {
  const toast = useToast();
  const sound = useSound();

  const [run, setRun] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [lastRound, setLastRound] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | starting | ready | throwing | revealed | deciding | settled
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [randomness, setRandomness] = useState(null);

  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setRun(null);
    setRounds([]);
    setLastRound(null);
    setSettlement(null);
    setPhase('idle');
    setError(null);
    inFlight.current = false;
  }, []);

  const start = useCallback(
    async ({ roomKey, championKey }) => {
      setBusy(true);
      setError(null);
      setPhase('starting');
      try {
        const data = await api.post('/api/runs', { roomKey, championKey });
        setRun(data.run);
        setRounds([]);
        setLastRound(null);
        setSettlement(null);
        setRandomness(data.randomness);
        setPhase(data.run.status === 'AWAITING_ENTRY' ? 'awaiting-entry' : 'ready');
        return data.run;
      } catch (err) {
        setError(err.message);
        setPhase('idle');
        toast.error('Could not start the run', err.message);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const play = useCallback(
    async (move) => {
      if (!run || inFlight.current) return null;
      // Guards double submits from fast clicking or a held key.
      inFlight.current = true;
      setBusy(true);
      setError(null);
      setPhase('throwing');
      sound.play('select');

      const throwAnimation = new Promise((resolve) => setTimeout(resolve, 900));

      try {
        const [data] = await Promise.all([
          api.post(`/api/runs/${run.id}/play`, { move, expectedRoundNumber: run.roundNumber }),
          throwAnimation,
        ]);

        setRun(data.run);
        setRounds((current) => [...current, data.round]);
        setLastRound(data.round);
        sound.play(data.outcome === 'win' ? 'win' : data.outcome === 'loss' ? 'loss' : 'tie');

        if (data.settlement) {
          setSettlement(data.settlement);
          setPhase('settled');
          if (data.autoClaimed) sound.play('claim');
        } else {
          setPhase('revealed');
        }
        return data;
      } catch (err) {
        setError(err.message);
        setPhase(run.status === 'AWAITING_DECISION' ? 'revealed' : 'ready');
        toast.error('Round failed', err.message);
        throw err;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [run, sound, toast]
  );

  const decide = useCallback(
    async (decision) => {
      if (!run || inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      try {
        const data = await api.post(
          `/api/runs/${run.id}/decision`,
          { decision },
          // A retried claim resolves to the original settlement instead of a
          // second one.
          { headers: { 'idempotency-key': `${run.id}-${decision}-${run.level}` } }
        );
        setRun(data.run);
        if (decision === 'claim') {
          setSettlement(data.settlement);
          setPhase('settled');
          sound.play('claim');
          toast.success('Reward claimed', `${data.settlement.reward.name} is yours.`);
        } else {
          setPhase('ready');
          setLastRound(null);
        }
        return data;
      } catch (err) {
        setError(err.message);
        toast.error(decision === 'claim' ? 'Claim failed' : 'Could not continue', err.message);
        throw err;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [run, sound, toast]
  );

  const confirmEntry = useCallback(
    async (txHash) => {
      setBusy(true);
      try {
        const data = await api.post(`/api/runs/${run.id}/entry`, { txHash });
        setRun(data.run);
        setPhase('ready');
        toast.success('Entry confirmed', 'Your arena fee was verified on chain.');
        return data;
      } catch (err) {
        toast.error('Entry not confirmed', err.message);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [run, toast]
  );

  return {
    run,
    rounds,
    lastRound,
    settlement,
    phase,
    busy,
    error,
    randomness,
    start,
    play,
    decide,
    confirmEntry,
    reset,
  };
}
