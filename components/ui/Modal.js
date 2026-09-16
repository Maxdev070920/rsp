'use client';

import { useEffect, useRef } from 'react';

/**
 * Accessible dialog: focus is trapped while open, Escape closes, and focus
 * returns to whatever opened it.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const timer = setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]');
      if (target) target.focus();
      else panelRef.current?.focus();
    }, 20);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
      body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === 'lg' ? 'max-w-3xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`panel relative z-10 w-full ${width} animate-pop-in rounded-b-none sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-arena-edge/70 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-arena-edge px-2 py-1 text-slate-400 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-arena-edge/70 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
