'use client';

import ChampionArt from '@/components/nft/ChampionArt';
import { CHAMPIONS } from '@/config/characters';

export default function ChampionPicker({ value, onChange, compact = false }) {
  return (
    <fieldset className="panel p-4">
      <legend className="label-eyebrow px-1">Choose your champion</legend>
      <p className="mb-3 text-xs text-slate-500">
        Champions are cosmetic in this release. Abilities can be added later without changing the rules.
      </p>
      <div className={`grid gap-2 ${compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
        {CHAMPIONS.map((champion) => {
          const active = champion.key === value;
          return (
            <button
              key={champion.key}
              type="button"
              onClick={() => onChange(champion.key)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition ${
                active ? 'border-aurora bg-aurora/10 shadow-glow-cyan' : 'border-arena-edge bg-arena-deep/50 hover:border-nebula/60'
              }`}
            >
              <ChampionArt champion={champion} size={compact ? 52 : 74} />
              <span className="font-display text-xs font-bold text-white">{champion.name}</span>
              {!compact && <span className="text-[10px] text-slate-400">{champion.title}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
