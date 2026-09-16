'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import useWallet from '@/hooks/useWallet';
import useToast from '@/hooks/useToast';
import { publicEnv } from '@/config/env';

export default function WalletModal({ open, onClose }) {
  const wallet = useWallet();
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  const handleConnect = async (connector) => {
    setBusy(connector.key);
    try {
      await wallet.connect(connector.key);
      toast.success('Wallet connected', 'Sign the linking message to attach it to your account.');
    } catch (error) {
      toast.error('Could not connect', error.message);
    } finally {
      setBusy(null);
    }
  };

  const handleLink = async () => {
    setBusy('link');
    try {
      const linked = await wallet.linkWallet();
      toast.success('Wallet linked', `${linked.address.slice(0, 10)}… is now attached to your account.`);
      onClose?.();
    } catch (error) {
      toast.error('Linking failed', error.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect a wallet"
      description="Practice Arena never requires a wallet. Paid arenas do."
    >
      {publicEnv.chainMode === 'demo' && (
        <p className="panel-inset mb-4 px-3 py-2 text-sm text-amber-200">
          This deployment runs in demo mode. You can still connect and link a wallet, but no transaction will be
          broadcast and nothing is minted on chain.
        </p>
      )}

      {!wallet.isConnected && (
        <ul className="space-y-2">
          {wallet.connectors.map((connector) => (
            <li key={connector.key}>
              <button
                type="button"
                disabled={!connector.available || busy === connector.key}
                onClick={() => handleConnect(connector)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-arena-edge bg-arena-deep/60 px-4 py-3 text-left transition hover:border-nebula/60 disabled:opacity-55"
              >
                <span>
                  <span className="block font-semibold text-white">{connector.name}</span>
                  <span className="block text-xs text-slate-400">
                    {connector.available ? connector.description : connector.unavailableReason || 'Not detected in this browser.'}
                  </span>
                </span>
                {connector.available ? (
                  <Badge tone="success">Detected</Badge>
                ) : connector.installUrl ? (
                  <a
                    href={connector.installUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-aurora underline underline-offset-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Install
                  </a>
                ) : (
                  <Badge>Unavailable</Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {wallet.isConnected && (
        <div className="space-y-4">
          <div className="panel-inset px-4 py-3">
            <p className="label-eyebrow">Connected address</p>
            <p className="break-all font-mono text-sm text-white">{wallet.address}</p>
            <p className="mt-2 text-xs text-slate-400">
              Network: {wallet.expectedChain?.name || 'unknown'} · Balance:{' '}
              {wallet.balance ? `${wallet.balance} ${wallet.expectedChain?.currency.symbol}` : '—'}
            </p>
          </div>

          {wallet.wrongNetwork && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
              <p className="font-semibold">Wrong network</p>
              <p className="mt-1 text-xs">
                Your wallet is on chain {wallet.chainId}. This arena expects {wallet.expectedChain?.name}.
              </p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => wallet.switchToExpectedChain().catch(() => {})}>
                Switch network
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleLink} loading={busy === 'link'} variant="cyan">
              Sign to link wallet
            </Button>
            <Button variant="ghost" onClick={wallet.disconnect}>
              Disconnect
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Linking asks you to sign a short message containing a one-time code from our server. It authorises no
            transaction and costs no gas. Your wallet address alone is never accepted as proof of identity.
          </p>
        </div>
      )}
    </Modal>
  );
}
