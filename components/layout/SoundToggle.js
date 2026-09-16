'use client';

import useSound from '@/hooks/useSound';

export default function SoundToggle({ className = '' }) {
  const { enabled, toggle } = useSound();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? 'Mute sound effects' : 'Enable sound effects'}
      className={`rounded-lg border border-arena-edge bg-arena-panel/60 px-2.5 py-2 text-slate-300 transition hover:text-white ${className}`}
    >
      <span aria-hidden="true">{enabled ? '🔊' : '🔈'}</span>
      <span className="sr-only">{enabled ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}</span>
    </button>
  );
}
