'use client';

import { useCallback, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the OS reduced-motion setting and reacts to live changes.
 * Subscribes to the media query directly rather than mirroring it into state,
 * so there is no render-then-correct flash.
 */
export default function useReducedMotion() {
  const subscribe = useCallback((onChange) => {
    const query = window.matchMedia(QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false // server render: assume motion is allowed
  );
}
