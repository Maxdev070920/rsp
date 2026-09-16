'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

/** Route-level error boundary with a real recovery path, not just a message. */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[app] unhandled error', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="label-eyebrow">Something broke</p>
      <h1 className="mt-2 font-display text-3xl font-black text-white">The arena dropped a frame</h1>
      <p className="mt-3 text-sm text-slate-400">
        An unexpected error interrupted this page. Any run already recorded on the server is safe — outcomes are stored
        server-side, so nothing you have claimed is lost.
      </p>
      {error?.digest && <p className="mt-2 font-mono text-xs text-slate-600">Reference: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
        <Button href="/history" variant="ghost">
          Check your history
        </Button>
        <Button href="/" variant="quiet">
          Back to the landing page
        </Button>
      </div>
    </div>
  );
}
