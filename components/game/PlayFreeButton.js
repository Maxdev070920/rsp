'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import useSession from '@/hooks/useSession';
import useToast from '@/hooks/useToast';

/** Starts a guest session if needed, then drops straight into Practice Arena. */
export default function PlayFreeButton({ size = 'lg', className = '', children = 'Play Free' }) {
  const router = useRouter();
  const { session, startGuest } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      if (!session) await startGuest();
      router.push('/game?room=practice');
    } catch (error) {
      toast.error('Could not start', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="gold" size={size} className={className} onClick={onClick} loading={busy} data-testid="play-free">
      {children}
    </Button>
  );
}
