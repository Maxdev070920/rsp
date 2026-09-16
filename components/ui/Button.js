'use client';

import Link from 'next/link';
import { forwardRef } from 'react';
import Spinner from './Spinner';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-nebula to-signal text-white shadow-glow hover:brightness-110 disabled:from-slate-700 disabled:to-slate-700',
  gold: 'bg-gradient-to-r from-ember to-amber-300 text-arena-void font-bold hover:brightness-110 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400',
  cyan: 'bg-gradient-to-r from-aurora to-cyan-300 text-arena-void font-bold hover:brightness-110 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400',
  ghost: 'border border-arena-edge bg-arena-panel/60 text-slate-200 hover:border-nebula/70 hover:text-white',
  danger: 'border border-rose-500/60 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50',
  quiet: 'text-slate-300 hover:text-white',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-70 active:translate-y-px';

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', href, loading = false, disabled, children, ...props },
  ref
) {
  const classes = `${base} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`;

  if (href) {
    return (
      <Link ref={ref} href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

export default Button;
