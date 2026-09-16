'use client';

import { publicEnv } from '@/config/env';
import { CHAINS, getChain } from '@/config/chains';

/**
 * Wallet connectors over the raw EIP-1193 interface.
 *
 * Ronin, MetaMask and any injected EIP-1193 provider are supported directly.
 * WalletConnect is declared but reports itself unavailable unless a project id
 * is configured — it is not silently dropped from the list.
 */

export class WalletError extends Error {
  constructor(message, code = 'WALLET_ERROR') {
    super(message);
    this.name = 'WalletError';
    this.code = code;
  }
}

/** Maps raw provider errors onto messages a player can act on. */
export function describeWalletError(error) {
  const code = error?.code;
  if (code === 4001) return 'You rejected the request in your wallet.';
  if (code === -32002) return 'Your wallet already has a pending request. Open it and finish or dismiss that request.';
  if (code === 4902) return 'That network is not in your wallet yet. Approve the prompt to add it.';
  if (code === -32603) return 'Your wallet rejected the request internally. Try again, or restart the wallet extension.';
  return error?.message || 'The wallet request failed. Try again.';
}

const injected = () => (typeof window === 'undefined' ? null : window.ethereum || null);

const roninProvider = () => {
  if (typeof window === 'undefined') return null;
  // Ronin exposes `window.ronin.provider`; some builds also set window.ethereum.
  return window.ronin?.provider || (window.ethereum?.isRonin ? window.ethereum : null);
};

const metaMaskProvider = () => {
  const eth = injected();
  if (!eth) return null;
  if (Array.isArray(eth.providers)) return eth.providers.find((p) => p.isMetaMask) || null;
  return eth.isMetaMask ? eth : null;
};

export const CONNECTORS = [
  {
    key: 'ronin',
    name: 'Ronin Wallet',
    description: 'Native wallet for the Ronin network.',
    installUrl: 'https://wallet.roninchain.com/',
    getProvider: roninProvider,
    get available() {
      return Boolean(roninProvider());
    },
  },
  {
    key: 'metamask',
    name: 'MetaMask',
    description: 'Browser extension wallet for EVM networks.',
    installUrl: 'https://metamask.io/download/',
    getProvider: metaMaskProvider,
    get available() {
      return Boolean(metaMaskProvider());
    },
  },
  {
    key: 'injected',
    name: 'Browser Wallet',
    description: 'Any other EIP-1193 wallet injected into this page.',
    installUrl: null,
    getProvider: injected,
    get available() {
      return Boolean(injected()) && !metaMaskProvider() && !roninProvider();
    },
  },
  {
    key: 'walletconnect',
    name: 'WalletConnect',
    description: 'Scan a QR code with a mobile wallet.',
    installUrl: 'https://walletconnect.network/',
    getProvider: () => null,
    get available() {
      // Requires @walletconnect/ethereum-provider plus a project id. Reported
      // honestly as unavailable rather than hidden from the picker.
      return false;
    },
    get unavailableReason() {
      return publicEnv.walletConnectProjectId
        ? 'WalletConnect transport is not bundled in this build.'
        : 'Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable WalletConnect.';
    },
  },
];

export const getConnector = (key) => CONNECTORS.find((c) => c.key === key) || null;

export async function connect(connectorKey) {
  const connector = getConnector(connectorKey);
  if (!connector) throw new WalletError('Unknown wallet connector.', 'UNKNOWN_CONNECTOR');

  const provider = connector.getProvider();
  if (!provider) {
    throw new WalletError(
      connector.unavailableReason || `${connector.name} was not detected in this browser.`,
      'NOT_INSTALLED'
    );
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts?.length) throw new WalletError('No accounts were returned by the wallet.', 'NO_ACCOUNTS');

  const chainIdHex = await provider.request({ method: 'eth_chainId' });
  return {
    provider,
    connectorKey,
    address: accounts[0],
    chainId: Number.parseInt(chainIdHex, 16),
  };
}

export async function switchChain(provider, chainId) {
  const chain = getChain(chainId);
  if (!chain) throw new WalletError(`Unsupported chain id ${chainId}.`, 'UNSUPPORTED_CHAIN');
  if (!chain.testnet && !publicEnv.allowMainnet) {
    throw new WalletError('Mainnet is disabled in this deployment.', 'MAINNET_DISABLED');
  }

  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chain.hexId }] });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: chain.hexId,
          chainName: chain.name,
          nativeCurrency: chain.currency,
          rpcUrls: chain.rpcUrls,
          blockExplorerUrls: chain.explorer ? [chain.explorer] : [],
        },
      ],
    });
  }
  return chain;
}

export async function signMessage(provider, address, message) {
  return provider.request({ method: 'personal_sign', params: [message, address] });
}

export async function getBalance(provider, address) {
  const hex = await provider.request({ method: 'eth_getBalance', params: [address, 'latest'] });
  const wei = BigInt(hex);
  // Six decimal places is plenty for a balance readout and avoids float drift.
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n) / 10n ** 12n;
  return `${whole}.${fraction.toString().padStart(6, '0')}`;
}

export const SUPPORTED_CHAIN_IDS = Object.values(CHAINS)
  .filter((chain) => chain.testnet || publicEnv.allowMainnet)
  .map((chain) => chain.id);
