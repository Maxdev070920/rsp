const TONES = {
  neutral: 'border-arena-edge bg-arena-deep/70 text-slate-300',
  nebula: 'border-nebula/50 bg-nebula/15 text-purple-200',
  aurora: 'border-aurora/50 bg-aurora/15 text-cyan-200',
  ember: 'border-ember/50 bg-ember/15 text-amber-200',
  signal: 'border-signal/50 bg-signal/15 text-blue-200',
  success: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200',
  danger: 'border-rose-500/50 bg-rose-500/15 text-rose-200',
};

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
