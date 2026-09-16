'use client';

import useToast from '@/hooks/useToast';

const TONES = {
  success: 'border-emerald-500/60 bg-emerald-950/80 text-emerald-100',
  error: 'border-rose-500/60 bg-rose-950/80 text-rose-100',
  warning: 'border-amber-500/60 bg-amber-950/80 text-amber-100',
  info: 'border-signal/60 bg-arena-panel/90 text-slate-100',
};

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto w-full max-w-sm animate-pop-in rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${TONES[toast.tone] || TONES.info}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-xs opacity-90">{toast.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-xs opacity-70 transition hover:opacity-100"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
