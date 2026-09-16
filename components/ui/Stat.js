export default function Stat({ label, value, hint, tone = 'default', className = '' }) {
  const valueTone =
    tone === 'gold' ? 'text-ember' : tone === 'cyan' ? 'text-aurora' : tone === 'danger' ? 'text-rose-300' : 'text-white';
  return (
    <div className={`panel-inset px-3 py-2.5 ${className}`}>
      <p className="label-eyebrow">{label}</p>
      <p className={`font-display text-lg font-bold leading-tight ${valueTone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
