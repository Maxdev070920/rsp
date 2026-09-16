'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import RewardArt from '@/components/nft/RewardArt';
import { getChain } from '@/config/chains';

/**
 * Mandatory pre-payment disclosure. Nothing is charged, and no run is created,
 * until the player has seen the fee, the network, the estimated gas, the
 * maximum possible loss, and how the odds work.
 */
export default function EntryConfirmDialog({ open, onClose, room, quote, onConfirm, busy }) {
  if (!room || !quote) return null;

  const chain = getChain(quote.network);
  const free = room.usesVirtualCredits;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Enter ${room.name}`}
      description="Review the cost and the odds before you enter."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="gold" onClick={onConfirm} loading={busy} data-autofocus data-testid="confirm-entry">
            {free ? 'Start free run' : `Confirm and pay ${quote.entryFee} ${room.currency}`}
          </Button>
        </div>
      }
    >
      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">Entry fee</dt>
          <dd className="font-display text-lg font-bold text-white">
            {free ? 'Free' : `${quote.entryFee} ${room.currency}`}
          </dd>
        </div>
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">Network</dt>
          <dd className="text-sm text-slate-200">{free ? 'Off-chain (virtual credits)' : chain?.name || quote.network}</dd>
        </div>
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">Estimated gas fee</dt>
          <dd className="text-sm text-slate-200">
            {free ? 'None' : `~${quote.estimatedNetworkFee} ${chain?.currency.symbol || room.currency}`}
          </dd>
        </div>
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">Maximum possible loss</dt>
          <dd className="text-sm text-rose-200">
            {free ? 'Nothing — practice only' : `${quote.maximumLoss} ${room.currency} plus gas`}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="label-eyebrow mb-2">Rewards available</p>
        <div className="flex items-center gap-3">
          <RewardArt rewardKey={quote.rewards.first.key} tier={room.artworkTier} size={72} />
          <span className="text-slate-500" aria-hidden="true">
            →
          </span>
          <RewardArt rewardKey={quote.rewards.final.key} tier={room.artworkTier} size={72} />
          <p className="text-xs text-slate-400">
            15 tiers from {quote.rewards.first.name} to {quote.rewards.final.name}.
            {room.mintsNft ? ' Claimed rewards are minted as NFTs.' : ' Nothing is minted in this arena.'}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-arena-edge/60 bg-arena-deep/50 px-3 py-3 text-xs leading-relaxed text-slate-300">
        <p className="font-semibold text-white">How the odds work</p>
        <p className="mt-1">
          Every resolved round is an even 50/50. Reaching level n has probability 1 / 2<sup>n</sup> — level 5 is 1 in 32,
          level 10 is 1 in 1,024, level 15 is 1 in 32,768. Ties are replayed and change nothing. If you continue after a
          win and then lose, the reward you were holding is forfeited in full.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={quote.mode === 'demo' ? 'ember' : 'aurora'}>{quote.mode === 'demo' ? 'Demo mode' : 'Blockchain mode'}</Badge>
          <Badge tone="nebula">Randomness: {quote.randomness.label}</Badge>
        </div>
      </div>
    </Modal>
  );
}
