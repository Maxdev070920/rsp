import { randomBytes } from 'node:crypto';
import { getAddress, verifyMessage } from 'ethers';
import { getRepository } from '@/lib/database/repository';
import { publicEnv } from '@/config/env';
import { getChain } from '@/config/chains';

const NONCE_TTL_MS = 5 * 60 * 1000;

export const normalizeAddress = (address) => {
  try {
    return getAddress(address).toLowerCase();
  } catch {
    return null;
  }
};

/**
 * Issues a single-use, server-generated nonce.
 *
 * A wallet address alone is public information and proves nothing. Identity is
 * only established once the holder signs this server-issued challenge.
 */
export async function issueNonce({ address, purpose = 'wallet-auth' }) {
  const normalized = normalizeAddress(address);
  if (!normalized) throw Object.assign(new Error('Invalid wallet address.'), { status: 400, code: 'BAD_ADDRESS' });

  const nonce = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();
  await getRepository().createNonce({ nonce, address: normalized, expiresAt, purpose });
  return { nonce, expiresAt };
}

/** The exact string the wallet signs. Domain + chain + nonce bind it in place. */
export function buildSignInMessage({ address, chainId, nonce, issuedAt, statement }) {
  const domain = new URL(publicEnv.appUrl).host;
  const chain = getChain(chainId);
  return [
    `${domain} wants you to sign in with your wallet.`,
    '',
    statement || 'Sign this message to link your wallet to your Elemental RPS Arena account. This does not authorise any transaction and costs no gas.',
    '',
    `Address: ${getAddress(address)}`,
    `Chain: ${chain ? chain.name : chainId} (${chainId})`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expires In: ${NONCE_TTL_MS / 1000} seconds`,
  ].join('\n');
}

/**
 * Verifies a wallet signature.
 *
 * Replay protection comes from three checks together: the nonce is consumed
 * atomically (single use), the message must contain that exact nonce, and the
 * recovered address must match the claimed one.
 */
export async function verifyWalletSignature({ address, chainId, nonce, signature, message }) {
  const normalized = normalizeAddress(address);
  if (!normalized) return { ok: false, reason: 'INVALID_ADDRESS' };

  const consumed = await getRepository().consumeNonce(nonce);
  if (!consumed) return { ok: false, reason: 'NONCE_INVALID_OR_USED' };
  if (consumed.address && consumed.address !== normalized) return { ok: false, reason: 'NONCE_ADDRESS_MISMATCH' };

  if (!message.includes(`Nonce: ${nonce}`)) return { ok: false, reason: 'MESSAGE_NONCE_MISMATCH' };
  if (!message.includes(`(${chainId})`)) return { ok: false, reason: 'MESSAGE_CHAIN_MISMATCH' };

  let recovered;
  try {
    recovered = verifyMessage(message, signature);
  } catch {
    return { ok: false, reason: 'SIGNATURE_MALFORMED' };
  }

  if (recovered.toLowerCase() !== normalized) return { ok: false, reason: 'SIGNATURE_MISMATCH' };
  return { ok: true, address: normalized, chainId };
}
