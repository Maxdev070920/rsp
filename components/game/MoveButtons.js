'use client';

import { useEffect } from 'react';
import HandGlyph from './HandGlyph';
import { MOVES, MOVE_LABELS, beats } from '@/lib/game/rps';

const HINTS = {
  rock: 'Beats Scissors',
  paper: 'Beats Rock',
  scissors: 'Beats Paper',
};

/**
 * The three throw controls. Fully keyboard operable: Tab to reach them, or
 * press 1, 2, 3 anywhere on the page.
 */
export default function MoveButtons({ onSelect, disabled, selected }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (disabled) return;
      const target = event.target;
      if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const index = ['1', '2', '3'].indexOf(event.key);
      if (index >= 0) {
        event.preventDefault();
        onSelect(MOVES[index]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSelect, disabled]);

  return (
    <div role="group" aria-label="Choose your throw" className="grid grid-cols-3 gap-2 sm:gap-4">
      {MOVES.map((move, index) => {
        const active = selected === move;
        return (
          <button
            key={move}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            aria-keyshortcuts={String(index + 1)}
            onClick={() => onSelect(move)}
            className={`panel group flex flex-col items-center gap-1.5 px-2 py-4 transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-5 ${
              active ? 'border-aurora/80 bg-aurora/10 shadow-glow-cyan' : 'hover:-translate-y-1 hover:border-nebula/70'
            }`}
          >
            <HandGlyph
              move={move}
              size={52}
              className="text-slate-300 transition group-hover:text-white"
              from={active ? '#37e5f0' : '#a45bff'}
              to={active ? '#ffb547' : '#4d7cff'}
            />
            <span className="font-display text-sm font-bold text-white">{MOVE_LABELS[move]}</span>
            <span className="hidden text-[10px] uppercase tracking-wider text-slate-500 sm:block">
              {HINTS[move]} ({MOVE_LABELS[beats(move)]})
            </span>
            <kbd className="rounded border border-arena-edge px-1.5 text-[10px] text-slate-500">{index + 1}</kbd>
          </button>
        );
      })}
    </div>
  );
}
