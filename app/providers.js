'use client';

import { ToastProvider } from '@/hooks/useToast';
import { SoundProvider } from '@/hooks/useSound';
import { SessionProvider } from '@/hooks/useSession';
import { WalletProvider } from '@/hooks/useWallet';
import ToastViewport from '@/components/ui/ToastViewport';

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <SoundProvider>
        <SessionProvider>
          <WalletProvider>
            {children}
            <ToastViewport />
          </WalletProvider>
        </SessionProvider>
      </SoundProvider>
    </ToastProvider>
  );
}
