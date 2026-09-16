import { useId } from 'react';

/**
 * Original hand glyphs for the three moves — abstract geometric marks drawn
 * from scratch rather than illustrative hands.
 */
function shapes(move, fillId, strokeId) {
  switch (move) {
    case 'paper':
      return (
        <>
          <rect x="13" y="12" width="38" height="44" rx="5" fill={`url(#${fillId})`} />
          <path d="M21 24h22M21 32h22M21 40h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </>
      );
    case 'scissors':
      return (
        <>
          <path d="M18 10 L38 42" stroke={`url(#${strokeId})`} strokeWidth="7" strokeLinecap="round" />
          <path d="M46 10 L26 42" stroke={`url(#${strokeId})`} strokeWidth="7" strokeLinecap="round" />
          <circle cx="22" cy="50" r="7" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="42" cy="50" r="7" fill="none" stroke="currentColor" strokeWidth="4" />
        </>
      );
    case 'rock':
    default:
      return (
        <>
          <circle cx="32" cy="34" r="20" fill={`url(#${fillId})`} />
          <path d="M22 28h8M34 28h8M26 43h13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </>
      );
  }
}

export default function HandGlyph({ move, size = 64, className = '', from = '#a45bff', to = '#37e5f0' }) {
  const uid = useId().replace(/[:]/g, '');
  const fillId = `hf-${uid}`;
  const strokeId = `hs-${uid}`;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      {shapes(move, fillId, strokeId)}
    </svg>
  );
}
