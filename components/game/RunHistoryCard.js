'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getRoom } from '@/config/rooms';
import { getReward } from '@/config/rewards';
import { MOVE_LABELS } from '@/lib/game/rps';
import { verifyCommitment, verifyRounds } from '@/lib/random/verifyClient';
import { api } from '@/lib/apiClient';

const STATUS_TONE = {
  CLAIMED: 'success',
  LOST: 'danger',
  ACTIVE: 'aurora',
  AWAITING_DECISION: 'ember',
  AWAITING_ENTRY: 'ember',
  CLAIMING: 'ember',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
  CREATED: 'neutral',
};

const duration = (run) => {
  if (!run.finishedAt) return 'in progress';
  const ms = new Date(run.finishedAt) - new Date(run.createdAt);
  const seconds = Math.max(1, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export default function RunHistoryCard({ run, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [detail, setDetail] = useState(null);
  const [verification, setVerification] = useState(null);
  const [busy, setBusy] = useState(false);

  const room = getRoom(run.roomKey);
  const reward = run.claimedLevel ? getReward(run.claimedLevel) : null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      try {
        setDetail(await api.get(`/api/runs/${run.id}`));
      } catch (error) {
        setDetail({ error: error.message });
      }
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const seed = detail?.randomness?.reveal?.seed;
      const commitment = detail?.randomness?.commitment;
      if (!seed) {
        setVerification({ available: false, reason: 'The seed is only revealed once a run has finished.' });
        return;
      }
      const commitmentOk = await verifyCommitment({ seed, commitment });
      const rounds = await verifyRounds({ seed, runId: run.id, rounds: detail.rounds });
      setVerification({
        available: true,
        commitmentOk,
        rounds,
        allValid: commitmentOk && rounds.every((r) => r.valid),
      });
    } catch (error) {
      setVerification({ available: false, reason: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="article" className="p-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[run.status] || 'neutral'}>{run.status.replace('_', ' ')}</Badge>
            <span className="font-display text-sm font-bold text-white">{room?.name || run.roomKey}</span>
            {reward && <span className="text-xs text-ember">{reward.name}</span>}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {new Date(run.createdAt).toLocaleString()} · {duration(run)} · entry{' '}
            {run.entryFee === '0' ? 'free' : `${run.entryFee} ${run.currency}`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>
            Level <span className="font-bold text-white">{run.claimedLevel ?? run.level}</span>
          </span>
          <span>{run.wins}W / {run.losses}L / {run.ties}T</span>
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-arena-edge/60 px-5 py-4">
          {!detail && <p className="text-sm text-slate-400">Loading rounds…</p>}
          {detail?.error && <p className="text-sm text-rose-300">{detail.error}</p>}

          {detail && !detail.error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="py-2">Round</th>
                      <th scope="col" className="py-2">You</th>
                      <th scope="col" className="py-2">Opponent</th>
                      <th scope="col" className="py-2">Result</th>
                      <th scope="col" className="py-2">Level</th>
                      <th scope="col" className="py-2">Proof digest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rounds.map((round) => {
                      const check = verification?.rounds?.find((r) => r.roundNumber === round.roundNumber);
                      return (
                        <tr key={round.roundNumber} className="border-t border-arena-edge/30">
                          <td className="py-2 font-mono text-slate-400">{round.roundNumber}</td>
                          <td className="py-2 text-slate-200">{MOVE_LABELS[round.playerMove]}</td>
                          <td className="py-2 text-slate-200">{MOVE_LABELS[round.opponentMove]}</td>
                          <td
                            className={`py-2 font-semibold ${
                              round.outcome === 'win'
                                ? 'text-emerald-300'
                                : round.outcome === 'loss'
                                  ? 'text-rose-300'
                                  : 'text-amber-300'
                            }`}
                          >
                            {round.outcome}
                            {round.outcome === 'tie' && <span className="ml-1 text-slate-500">(replayed)</span>}
                          </td>
                          <td className="py-2 text-slate-400">
                            {round.levelBefore} → {round.levelAfter}
                          </td>
                          <td className="py-2 font-mono text-[10px] text-slate-500">
                            {round.proof?.digest ? `${round.proof.digest.slice(0, 16)}…` : '—'}
                            {check && (
                              <span className={check.valid ? 'ml-2 text-emerald-400' : 'ml-2 text-rose-400'}>
                                {check.valid ? '✓' : '✕'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="panel-inset px-3 py-2">
                  <p className="label-eyebrow">Randomness commitment</p>
                  <p className="break-all font-mono text-[10px] text-slate-400">
                    {detail.randomness.commitment || '—'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">Provider: {detail.randomness.label}</p>
                </div>
                <div className="panel-inset px-3 py-2">
                  <p className="label-eyebrow">Revealed seed</p>
                  <p className="break-all font-mono text-[10px] text-slate-400">
                    {detail.randomness.reveal?.seed || 'Revealed when the run ends'}
                  </p>
                </div>
              </div>

              {detail.earnedReward && (
                <div className="panel-inset mt-3 px-3 py-2 text-xs text-slate-300">
                  <p className="label-eyebrow">Claim record</p>
                  <p className="mt-1">
                    {getReward(detail.earnedReward.reward_level)?.name} · minted:{' '}
                    {detail.earnedReward.mint_status || 'n/a'}
                    {detail.earnedReward.tx_hash ? ` · tx ${detail.earnedReward.tx_hash.slice(0, 18)}…` : ''}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="ghost" onClick={verify} loading={busy}>
                  Verify randomness in my browser
                </Button>
                {verification?.available === false && <p className="text-xs text-amber-300">{verification.reason}</p>}
                {verification?.available && (
                  <p className={`text-xs ${verification.allValid ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {verification.allValid
                      ? `Commitment matches and all ${verification.rounds.length} rounds recompute correctly.`
                      : 'Verification failed. The published proof does not match these rounds.'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
