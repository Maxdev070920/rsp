'use client';

import HandGlyph from './HandGlyph';
import ChampionArt from '@/components/nft/ChampionArt';
import { MOVE_LABELS } from '@/lib/game/rps';
import useReducedMotion from '@/hooks/useReducedMotion';

const OUTCOME_COPY = {
  win: { title: 'Resolved win', tone: 'text-emerald-300', detail: 'You advance one reward level.' },
  loss: { title: 'Resolved loss', tone: 'text-rose-300', detail: 'The run ends here.' },
  tie: { title: 'Tie — replay', tone: 'text-amber-300', detail: 'Same reward level. Throw again.' },
};

/**
 * The arena stage. During `throwing` both sides shake; once the server returns
 * the authoritative result, the real moves are revealed.
 */
export default function RoundStage({ champion, opponent, phase, lastRound, playerMove }) {
  const reducedMotion = useReducedMotion();
  const throwing = phase === 'throwing';
  const revealed = Boolean(lastRound) && !throwing;
  const outcome = revealed ? OUTCOME_COPY[lastRound.outcome] : null;
  const shake = throwing && !reducedMotion ? 'animate-shake-hand' : '';

  return (
    <section aria-label="Arena stage" className="panel relative overflow-hidden p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aurora/70 to-transparent"
      />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <ChampionArt champion={champion} size={110} pose={throwing ? 'throw' : 'idle'} className={shake} />
          <p className="font-display text-sm font-bold text-white">{champion.name}</p>
          <p className="text-[11px] text-slate-400">You</p>
          <div className="h-16">
            {(throwing || revealed) && (
              <div className={`flex flex-col items-center ${revealed ? 'animate-pop-in' : shake}`}>
                <HandGlyph move={revealed ? lastRound.playerMove : playerMove || 'rock'} size={44} from="#37e5f0" to="#4d7cff" />
                {revealed && <span className="text-[11px] text-slate-300">{MOVE_LABELS[lastRound.playerMove]}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 px-1">
          <span aria-hidden="true" className="font-display text-xl font-black text-slate-600">
            VS
          </span>
          <div aria-live="polite" className="min-h-[3.5rem] text-center">
            {throwing && <p className="text-xs text-slate-400">Resolving…</p>}
            {revealed && (
              <>
                <p className={`font-display text-sm font-black ${outcome.tone}`}>{outcome.title}</p>
                <p className="mt-0.5 max-w-[10rem] text-[11px] leading-tight text-slate-400">{outcome.detail}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ChampionArt champion={opponent} size={110} pose={throwing ? 'throw' : 'idle'} className={shake} />
          <p className="font-display text-sm font-bold text-white">{opponent.name}</p>
          <p className="text-[11px] text-slate-400">Opponent</p>
          <div className="h-16">
            {(throwing || revealed) && (
              <div className={`flex flex-col items-center ${revealed ? 'animate-pop-in' : shake}`}>
                <HandGlyph move={revealed ? lastRound.opponentMove : 'rock'} size={44} from="#ffb547" to="#a45bff" />
                {revealed && <span className="text-[11px] text-slate-300">{MOVE_LABELS[lastRound.opponentMove]}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
