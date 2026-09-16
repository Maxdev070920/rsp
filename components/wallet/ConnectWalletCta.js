'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import WalletModal from './WalletModal';

export default function ConnectWalletCta({ size = 'lg', variant = 'ghost', className = '', children = 'Connect Wallet' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
