'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/apiClient';
import { publicEnv } from '@/config/env';
import { getChain } from '@/config/chains';
import {
  CONNECTORS,
  connect as connectWallet,
  describeWalletError,
  getBalance,
  signMessage,
  switchChain,
} from '@/lib/wallet/connectors';
import useSession from './useSession';

const WalletContext = createContext(null);
const LAST_CONNECTOR_KEY = 'era:last-connector';

export function WalletProvider({ children }) {
  const { setWallets, refresh } = useSession();
  const [state, setState] = useState({
    provider: null,
    connectorKey: null,
    address: null,
    chainId: null,
    balance: null,
  });
  const [status, setStatus] = useState('idle'); // idle | connecting | signing | connected | error
  const [error, setError] = useState(null);

  const expectedChain = getChain(publicEnv.chainId);
  const wrongNetwork = Boolean(state.chainId && state.chainId !== publicEnv.chainId);

  const disconnect = useCallback(() => {
    setState({ provider: null, connectorKey: null, address: null, chainId: null, balance: null });
    setStatus('idle');
    setError(null);
    try {
      window.localStorage.removeItem(LAST_CONNECTOR_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Wallet account/chain changes must never leave stale state on screen.
  useEffect(() => {
    const provider = state.provider;
    if (!provider?.on) return undefined;

    const onAccounts = (accounts) => {
      if (!accounts?.length) disconnect();
      else setState((current) => ({ ...current, address: accounts[0], balance: null }));
    };
    const onChain = (hex) => setState((current) => ({ ...current, chainId: Number.parseInt(hex, 16), balance: null }));

    provider.on('accountsChanged', onAccounts);
    provider.on('chainChanged', onChain);
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, [state.provider, disconnect]);

  useEffect(() => {
    let cancelled = false;
    if (!state.provider || !state.address) return undefined;
    getBalance(state.provider, state.address)
      .then((balance) => !cancelled && setState((current) => ({ ...current, balance })))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.provider, state.address, state.chainId]);

  const connect = useCallback(async (connectorKey) => {
    setStatus('connecting');
    setError(null);
    try {
      const result = await connectWallet(connectorKey);
      setState({ ...result, balance: null });
      setStatus('connected');
      try {
        window.localStorage.setItem(LAST_CONNECTOR_KEY, connectorKey);
      } catch {
        /* ignore */
      }
      return result;
    } catch (err) {
      const message = describeWalletError(err);
      setError(message);
      setStatus('error');
      throw new Error(message);
    }
  }, []);

  const switchToExpectedChain = useCallback(async () => {
    if (!state.provider) throw new Error('Connect a wallet first.');
    try {
      const chain = await switchChain(state.provider, publicEnv.chainId);
      setState((current) => ({ ...current, chainId: chain.id }));
      return chain;
    } catch (err) {
      const message = describeWalletError(err);
      setError(message);
      throw new Error(message);
    }
  }, [state.provider]);

  /**
   * Links the connected wallet to the account by signing a server-issued nonce.
   * The address alone is never accepted as proof of identity.
   */
  const linkWallet = useCallback(async () => {
    if (!state.provider || !state.address) throw new Error('Connect a wallet first.');
    setStatus('signing');
    try {
      const challenge = await api.post('/api/wallet/nonce', {
        address: state.address,
        chainId: state.chainId,
      });
      const signature = await signMessage(state.provider, state.address, challenge.message);
      const result = await api.post('/api/wallet/verify', {
        address: state.address,
        chainId: state.chainId,
        nonce: challenge.nonce,
        signature,
        message: challenge.message,
      });
      setWallets(result.wallets);
      await refresh();
      setStatus('connected');
      return result.wallet;
    } catch (err) {
      const message = err.name === 'ApiError' ? err.message : describeWalletError(err);
      setError(message);
      setStatus('connected');
      throw new Error(message);
    }
  }, [state.provider, state.address, state.chainId, setWallets, refresh]);

  const unlinkWallet = useCallback(
    async (address) => {
      const result = await api.del(`/api/wallet/${address}`);
      setWallets(result.wallets);
      return result;
    },
    [setWallets]
  );

  const value = useMemo(
    () => ({
      ...state,
      status,
      error,
      connectors: CONNECTORS,
      expectedChain,
      wrongNetwork,
      isConnected: Boolean(state.address),
      connect,
      disconnect,
      linkWallet,
      unlinkWallet,
      switchToExpectedChain,
      clearError: () => setError(null),
    }),
    [state, status, error, expectedChain, wrongNetwork, connect, disconnect, linkWallet, unlinkWallet, switchToExpectedChain]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export default function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside a WalletProvider');
  return context;
}
