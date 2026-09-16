'use client';

import Button from '@/components/ui/Button';
import RewardArt from '@/components/nft/RewardArt';
import { percentLabel } from '@/lib/game/probability';

/**
 * The claim-or-continue fork. Both consequences are stated in full before
 * either button is pressed: what is banked, and what is forfeited on a loss.
 */
export default function DecisionPanel({ run, room, busy, onClaim, onContinue }) {
  const current = run.currentReward;
  const next = run.nextReward;
  if (!current) return null;

  return (
    <section aria-label="Claim or continue" className="panel border-ember/40 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <RewardArt rewardKey={current.key} tier={room?.artworkTier || 'standard'} size={120} className="mx-auto shrink-0" />

        <div className="flex-1">
          <p className="label-eyebrow">Level {current.level} unlocked</p>
          <h2 className="font-display text-xl font-black text-white">{current.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{current.description}</p>

          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="panel-inset px-3 py-2">
              <dt className="label-eyebrow">Claim now</dt>
              <dd className="mt-0.5 text-slate-200">
                Keep {current.name}. The run ends immediately{room?.mintsNft ? ' and the reward is minted.' : '.'}
              </dd>
            </div>
            <div className="panel-inset px-3 py-2">
              <dt className="label-eyebrow">Continue</dt>
              <dd className="mt-0.5 text-slate-200">
                {next ? (
                  <>
                    50% to reach {next.name} ({percentLabel(next.probability)} from the start of a run). Lose and you
                    forfeit {current.name} entirely.
                  </>
                ) : (
                  'You are at the top of the ladder.'
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="gold" size="lg" className="flex-1" onClick={onClaim} loading={busy} data-testid="claim-button">
          Claim {current.name}
        </Button>
        <Button variant="ghost" size="lg" className="flex-1" onClick={onContinue} disabled={busy} data-testid="continue-button">
          Continue — risk it for {next ? next.name : 'the final tier'}
        </Button>
      </div>
    </section>
  );
}
