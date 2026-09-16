'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const SoundContext = createContext(null);
const STORAGE_KEY = 'era:sound-enabled';

/**
 * Synthesised sound effects via the Web Audio API — no audio files, so there is
 * no third-party audio asset anywhere in the project. Muted until the player
 * opts in, and the context is only created after a user gesture.
 */
const TONES = {
  select: [{ freq: 520, dur: 0.07, type: 'triangle', gain: 0.08 }],
  win: [
    { freq: 523.25, dur: 0.1, type: 'triangle', gain: 0.1 },
    { freq: 783.99, dur: 0.16, type: 'triangle', gain: 0.09, delay: 0.09 },
  ],
  loss: [
    { freq: 196, dur: 0.18, type: 'sawtooth', gain: 0.07 },
    { freq: 130.81, dur: 0.26, type: 'sawtooth', gain: 0.06, delay: 0.14 },
  ],
  tie: [{ freq: 330, dur: 0.12, type: 'sine', gain: 0.07 }],
  claim: [
    { freq: 659.25, dur: 0.12, type: 'triangle', gain: 0.1 },
    { freq: 880, dur: 0.14, type: 'triangle', gain: 0.09, delay: 0.1 },
    { freq: 1174.66, dur: 0.22, type: 'triangle', gain: 0.08, delay: 0.21 },
  ],
};

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const contextRef = useRef(null);

  useEffect(() => {
    try {
      // Deliberate: localStorage is unavailable during SSR, so the stored
      // preference can only be applied after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabled(window.localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      // Storage can be blocked; sound simply stays off.
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (name) => {
      if (!enabled || !TONES[name]) return;
      try {
        if (!contextRef.current) {
          const Ctor = window.AudioContext || window.webkitAudioContext;
          if (!Ctor) return;
          contextRef.current = new Ctor();
        }
        const ctx = contextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        TONES[name].forEach(({ freq, dur, type, gain, delay = 0 }) => {
          const osc = ctx.createOscillator();
          const amp = ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          amp.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
          amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
          amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
          osc.connect(amp).connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + dur + 0.02);
        });
      } catch {
        // Audio is a nicety; never let it break gameplay.
      }
    },
    [enabled]
  );

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export default function useSound() {
  return useContext(SoundContext) || { enabled: false, toggle: () => {}, play: () => {} };
}
