'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import WalletModal from './WalletModal';
import useWallet from '@/hooks/useWallet';
import useSession from '@/hooks/useSession';

const short = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export default function WalletButton({ size = 'sm', variant = 'ghost', className = '' }) {
  const [open, setOpen] = useState(false);
  const wallet = useWallet();
  const { wallets } = useSession();

  const linked = wallets?.[0];
  const label = wallet.isConnected
    ? short(wallet.address)
    : linked
      ? short(linked.address)
      : 'Connect Wallet';

  return (
    <>
      <Button
        size={size}
        variant={wallet.wrongNetwork ? 'danger' : variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">{wallet.wrongNetwork ? '⚠' : '◈'}</span>
        <span className="font-mono">{label}</span>
      </Button>
      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
