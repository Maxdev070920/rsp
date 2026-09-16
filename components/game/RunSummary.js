'use client';

import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import RewardArt from '@/components/nft/RewardArt';
import { explorerTxUrl } from '@/config/chains';

/** End-of-run panel for both outcomes: claimed, or lost with nothing. */
export default function RunSummary({ run, settlement, room, onPlayAgain }) {
  const claimed = Boolean(settlement?.claimedLevel);
  const reward = settlement?.reward;
  const forfeited = settlement?.forfeited;
  const mint = settlement?.mint;

  return (
    <section
      aria-label="Run summary"
      className={`panel animate-pop-in p-6 text-center ${claimed ? 'border-ember/60' : 'border-rose-500/50'}`}
    >
      {claimed ? (
        <>
          <p className="label-eyebrow">{settlement.auto ? 'Level 15 — automatic claim' : 'Reward claimed'}</p>
          <h2 className="mt-1 font-display text-2xl font-black text-ember">{reward.name}</h2>
          <div className="mt-4 flex justify-center">
            <RewardArt rewardKey={reward.key} tier={room?.artworkTier || 'standard'} size={200} />
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-300">{reward.description}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Badge tone="ember">Level {reward.level} of 15</Badge>
            <Badge tone="nebula">{reward.probabilityLabel}</Badge>
            {mint?.simulated && <Badge tone="ember">Simulated mint</Badge>}
            {mint && !mint.simulated && mint.status === 'MINTED' && <Badge tone="signal">Minted on chain</Badge>}
            {mint?.status === 'FAILED' && <Badge tone="danger">Mint failed — reward still recorded</Badge>}
          </div>

          {mint?.tx_hash && !mint.simulated && mint.chain_id && (
            <p className="mt-3 text-xs">
              <a className="link-quiet" href={explorerTxUrl(mint.chain_id, mint.tx_hash)} target="_blank" rel="noreferrer noopener">
                View mint transaction
              </a>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="label-eyebrow">Run over</p>
          <h2 className="mt-1 font-display text-2xl font-black text-rose-300">Resolved loss</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">
            {forfeited ? (
              <>
                You were holding <span className="font-semibold text-white">{forfeited.name}</span> unclaimed when the
                round resolved against you. It is forfeited in full — no reward is awarded from this run.
              </>
            ) : (
              'The first resolved round went against you, so the run ends with no reward.'
            )}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-slate-400">
            <Badge>Rounds played: {run.roundNumber}</Badge>
            <Badge>Ties replayed: {run.ties}</Badge>
            <Badge>Peak level: {run.level}</Badge>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={onPlayAgain} variant="primary">
          Play again
        </Button>
        <Button href="/collection" variant="ghost">
          View collection
        </Button>
        <Button href={`/history?run=${run.id}`} variant="quiet">
          Verify this run
        </Button>
      </div>
    </section>
  );
}
