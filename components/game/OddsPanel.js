'use client';

import Stat from '@/components/ui/Stat';
import { percentLabel } from '@/lib/game/probability';

/**
 * The full disclosure block. Everything a player needs to decide whether to
 * claim or continue is on screen at once, with no hidden multipliers.
 */
export default function OddsPanel({ run, room, quote, randomness }) {
  const odds = run?.odds;
  if (!odds) return null;

  const atRisk = run.amountAtRisk;

  return (
    <section aria-label="Odds and stakes" className="panel p-4">
      <p className="label-eyebrow mb-3">Odds &amp; stakes</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label="Reached this level"
          value={odds.currentOdds}
          hint={percentLabel(odds.currentProbability)}
          tone="cyan"
        />
        <Stat
          label="If you continue"
          value={odds.nextOdds || 'Maximum'}
          hint={odds.nextProbability ? percentLabel(odds.nextProbability) : 'Level 15 auto-claims'}
        />
        <Stat label="Win streak" value={run.streak} hint={`${run.ties} tie${run.ties === 1 ? '' : 's'} replayed`} />
        <Stat label="Current reward" value={run.currentReward ? run.currentReward.name : 'None yet'} tone="gold" />
        <Stat
          label="Next reward"
          value={run.nextReward ? run.nextReward.name : 'Ladder complete'}
          hint={run.nextReward ? `Level ${run.nextReward.level}` : undefined}
        />
        <Stat
          label="At risk now"
          value={atRisk ? atRisk.name : '—'}
          hint={atRisk ? 'Forfeited entirely if you lose' : 'Nothing pending'}
          tone={atRisk ? 'danger' : 'default'}
        />
        <Stat label="Entry fee" value={`${run.entryFee} ${run.currency === 'credits' ? 'credits' : run.currency}`} />
        <Stat
          label="Est. network fee"
          value={quote ? `${quote.estimatedNetworkFee} ${room?.currency === 'credits' ? '' : room?.currency || ''}`.trim() : '—'}
          hint={run.mode === 'demo' ? 'No transaction in demo mode' : undefined}
        />
        <Stat
          label="Mode"
          value={run.mode === 'demo' ? 'Demo' : 'Blockchain'}
          hint={randomness ? randomness.label : undefined}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Each resolved round is an even 50/50, so the chance of reaching level n from the start of a run is 1 / 2
        <sup>n</sup>. Ties are replayed and count as neither a win nor a loss, so they do not change these odds.
      </p>
    </section>
  );
}
