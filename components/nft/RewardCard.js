'use client';

import Badge from '@/components/ui/Badge';
import RewardArt from './RewardArt';
import { percentLabel } from '@/lib/game/probability';

export default function RewardCard({ definition, earned = [], onSelect, tier = 'standard' }) {
  const unlocked = earned.length > 0;
  const minted = earned.filter((entry) => entry.mint && entry.mint.status !== 'FAILED').length;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(definition, earned)}
      aria-label={`${definition.name}, level ${definition.level}, ${unlocked ? `earned ${earned.length} time${earned.length === 1 ? '' : 's'}` : 'not yet earned'}`}
      className={`group panel flex w-full flex-col items-center gap-3 p-4 text-center transition duration-200 hover:-translate-y-1 hover:border-nebula/60 ${
        unlocked ? '' : 'opacity-75 saturate-50'
      }`}
    >
      <div className="relative">
        <RewardArt rewardKey={definition.key} tier={tier} size={170} locked={!unlocked} />
        {!unlocked && (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-arena-void/55 text-3xl" aria-hidden="true">
            🔒
          </span>
        )}
        {earned.length > 1 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-nebula px-2 py-0.5 text-xs font-bold text-white">
            ×{earned.length}
          </span>
        )}
      </div>

      <div className="w-full">
        <p className="label-eyebrow">Level {definition.level} · {definition.category}</p>
        <h3 className="font-display text-sm font-bold text-white">{definition.name}</h3>
        <p className="mt-1 text-[11px] text-slate-400">
          {definition.probabilityLabel} · {percentLabel(definition.probability)}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {unlocked ? <Badge tone="success">Earned</Badge> : <Badge>Locked</Badge>}
        {minted > 0 && <Badge tone="signal">{minted} minted</Badge>}
      </div>
    </button>
  );
}
