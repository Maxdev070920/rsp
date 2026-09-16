import { JsonRpcProvider, formatEther, parseEther } from 'ethers';
import { getChain } from '@/config/chains';
import { publicEnv } from '@/config/env';

/**
 * Server-side verification of an entry-fee transaction.
 *
 * The client tells us a transaction hash; that claim is worthless on its own.
 * This reads the receipt from an RPC node and checks recipient, value, status
 * and confirmation depth before a run is allowed to become ACTIVE.
 */

const providers = new Map();

function providerFor(chainId) {
  const chain = getChain(chainId);
  if (!chain) return null;
  const rpcUrl = process.env.RPC_URL_OVERRIDE || chain.rpcUrls[0];
  if (!providers.has(chainId)) providers.set(chainId, new JsonRpcProvider(rpcUrl, chainId));
  return providers.get(chainId);
}

export class ChainVerificationError extends Error {
  constructor(message, code = 'CHAIN_VERIFICATION_FAILED') {
    super(message);
    this.name = 'ChainVerificationError';
    this.code = code;
    this.status = 400;
  }
}

export async function verifyEntryPayment({ txHash, chainId, expectedFee, expectedFrom, minConfirmations = 1 }) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash || '')) {
    throw new ChainVerificationError('Transaction hash is malformed.', 'BAD_TX_HASH');
  }

  const provider = providerFor(chainId);
  if (!provider) throw new ChainVerificationError(`Unsupported chain id ${chainId}.`, 'UNSUPPORTED_CHAIN');

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new ChainVerificationError('Transaction not found yet. Wait for it to be mined and retry.', 'TX_PENDING');
  if (receipt.status !== 1) throw new ChainVerificationError('The entry transaction reverted on chain.', 'TX_REVERTED');

  const confirmations = await receipt.confirmations();
  if (confirmations < minConfirmations) {
    throw new ChainVerificationError('Transaction needs more confirmations. Try again in a moment.', 'TX_UNCONFIRMED');
  }

  const tx = await provider.getTransaction(txHash);
  const arena = publicEnv.arenaContract?.toLowerCase();
  if (arena && tx.to?.toLowerCase() !== arena) {
    throw new ChainVerificationError('Transaction was not sent to the arena contract.', 'WRONG_RECIPIENT');
  }
  if (expectedFrom && tx.from?.toLowerCase() !== expectedFrom.toLowerCase()) {
    throw new ChainVerificationError('Transaction was sent from a different wallet than the linked one.', 'WRONG_SENDER');
  }

  const required = parseEther(String(expectedFee));
  if (tx.value < required) {
    throw new ChainVerificationError(
      `Entry fee underpaid: sent ${formatEther(tx.value)}, required ${expectedFee}.`,
      'UNDERPAID'
    );
  }

  return {
    verified: true,
    txHash,
    from: tx.from.toLowerCase(),
    value: formatEther(tx.value),
    blockNumber: receipt.blockNumber,
    confirmations,
  };
}

export async function getNativeBalance({ address, chainId }) {
  const provider = providerFor(chainId);
  if (!provider) return null;
  const balance = await provider.getBalance(address);
  return formatEther(balance);
}
