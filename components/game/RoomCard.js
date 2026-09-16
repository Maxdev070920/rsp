'use client';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function RoomCard({ room, onEnter, busy }) {
  const { eligibility, quote } = room;
  const free = room.usesVirtualCredits;

  return (
    <Card as="article" className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone={room.accent}>{room.difficulty}</Badge>
          <h2 className="mt-2 font-display text-xl font-black text-white">{room.name}</h2>
          <p className="text-xs text-slate-400">{room.tagline}</p>
        </div>
        <div className="text-right">
          <p className="label-eyebrow">Entry</p>
          <p className="font-display text-xl font-black text-ember">
            {free ? 'Free' : `${room.entryFee}`}
          </p>
          <p className="text-[11px] text-slate-500">{free ? 'virtual credits' : room.currency}</p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-300">{room.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">Leaderboard</dt>
          <dd className="text-slate-200">
            {room.leaderboardMultiplier === 0 ? 'Unranked' : `${room.leaderboardMultiplier}× multiplier`}
          </dd>
        </div>
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">Network</dt>
          <dd className="text-slate-200">{free ? 'Off-chain' : `Chain ${quote.network}`}</dd>
        </div>
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">Artwork tier</dt>
          <dd className="capitalize text-slate-200">{room.artworkTier}</dd>
        </div>
        <div className="panel-inset px-3 py-2">
          <dt className="label-eyebrow">NFT minting</dt>
          <dd className="text-slate-200">{room.mintsNft ? (quote.mintsNft ? 'On chain' : 'Simulated in demo') : 'None'}</dd>
        </div>
      </dl>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {room.perks.map((perk) => (
          <li key={perk}>
            <Badge>{perk}</Badge>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {eligibility.eligible ? (
          <Button
            variant={free ? 'cyan' : 'gold'}
            className="w-full"
            onClick={() => onEnter(room)}
            loading={busy}
            data-testid={`enter-${room.key}`}
          >
            {free ? 'Play free' : `Enter for ${room.entryFee} ${room.currency}`}
          </Button>
        ) : (
          <div>
            <Button variant="ghost" className="w-full" disabled>
              Not available yet
            </Button>
            <p className="mt-2 text-center text-xs text-amber-200">{eligibility.reason}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
