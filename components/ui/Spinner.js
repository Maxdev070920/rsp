export default function Spinner({ className = 'h-5 w-5', label }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span className="text-sm text-slate-300">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}
