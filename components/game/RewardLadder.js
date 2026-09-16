'use client';

import { REWARD_DEFINITIONS } from '@/config/rewards';

/**
 * The 15-tier ladder. Current level, the level at risk, and the next target are
 * all conveyed with text as well as colour so the state is never colour-only.
 */
export default function RewardLadder({ level = 0, atRisk = false, compact = false }) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="label-eyebrow">Reward ladder</p>
        <p className="text-xs text-slate-400">
          Level <span className="font-bold text-white">{level}</span> of 15
        </p>
      </div>

      <ol className={`grid gap-1 ${compact ? 'grid-cols-15' : 'grid-cols-5 sm:grid-cols-8 lg:grid-cols-5'}`}>
        {REWARD_DEFINITIONS.map((reward) => {
          const reached = reward.level <= level;
          const current = reward.level === level;
          const next = reward.level === level + 1;
          return (
            <li key={reward.key}>
              <div
                aria-current={current ? 'step' : undefined}
                title={`${reward.name} — ${reward.probabilityLabel}`}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-center transition ${
                  current
                    ? `border-ember bg-ember/15 ${atRisk ? 'ring-2 ring-rose-400/70' : ''}`
                    : reached
                      ? 'border-nebula/50 bg-nebula/10'
                      : next
                        ? 'border-aurora/40 bg-aurora/5'
                        : 'border-arena-edge/60 bg-arena-deep/40'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: reached || next ? `linear-gradient(135deg, ${reward.from}, ${reward.via})` : '#2a2550' }}
                  aria-hidden="true"
                />
                <span className={`text-[10px] font-bold ${reached ? 'text-white' : 'text-slate-500'}`}>{reward.level}</span>
                {!compact && (
                  <span className={`hidden text-[9px] leading-tight sm:block ${reached ? 'text-slate-300' : 'text-slate-600'}`}>
                    {reward.name.split(' ')[0]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {atRisk && (
        <p className="mt-3 rounded-lg border border-rose-500/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          Level {level} is unclaimed and at risk. Lose the next resolved round and you leave with nothing.
        </p>
      )}
    </div>
  );
}
