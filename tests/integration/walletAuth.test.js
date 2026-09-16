import { beforeEach, describe, expect, it } from 'vitest';
import { Wallet } from 'ethers';
import { MemoryRepository, resetMemoryDb } from '@/lib/database/memoryRepository';
import { getRepository, setRepository } from '@/lib/database/repository';
import { buildSignInMessage, issueNonce, normalizeAddress, verifyWalletSignature } from '@/lib/auth/walletAuth';

const CHAIN_ID = 2021;

async function challengeFor(wallet) {
  const { nonce } = await issueNonce({ address: wallet.address });
  const message = buildSignInMessage({
    address: wallet.address,
    chainId: CHAIN_ID,
    nonce,
    issuedAt: new Date().toISOString(),
  });
  return { nonce, message };
}

beforeEach(() => {
  resetMemoryDb();
  setRepository(new MemoryRepository());
});

describe('wallet signature authentication', () => {
  it('accepts a correctly signed server-issued challenge', async () => {
    const wallet = Wallet.createRandom();
    const { nonce, message } = await challengeFor(wallet);
    const signature = await wallet.signMessage(message);

    const result = await verifyWalletSignature({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce,
      signature,
      message,
    });

    expect(result.ok).toBe(true);
    expect(result.address).toBe(wallet.address.toLowerCase());
  });

  it('rejects a replayed nonce — single use only', async () => {
    const wallet = Wallet.createRandom();
    const { nonce, message } = await challengeFor(wallet);
    const signature = await wallet.signMessage(message);
    const input = { address: wallet.address, chainId: CHAIN_ID, nonce, signature, message };

    expect((await verifyWalletSignature(input)).ok).toBe(true);
    const second = await verifyWalletSignature(input);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('NONCE_INVALID_OR_USED');
  });

  it('rejects a signature from a different wallet', async () => {
    const owner = Wallet.createRandom();
    const impostor = Wallet.createRandom();
    const { nonce, message } = await challengeFor(owner);
    const signature = await impostor.signMessage(message);

    const result = await verifyWalletSignature({
      address: owner.address,
      chainId: CHAIN_ID,
      nonce,
      signature,
      message,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('SIGNATURE_MISMATCH');
  });

  it('rejects a message whose nonce does not match the issued one', async () => {
    const wallet = Wallet.createRandom();
    const { nonce } = await challengeFor(wallet);
    const tampered = buildSignInMessage({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce: 'a-different-nonce-entirely',
      issuedAt: new Date().toISOString(),
    });
    const signature = await wallet.signMessage(tampered);

    const result = await verifyWalletSignature({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce,
      signature,
      message: tampered,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('MESSAGE_NONCE_MISMATCH');
  });

  it('rejects a message signed for a different chain', async () => {
    const wallet = Wallet.createRandom();
    const { nonce, message } = await challengeFor(wallet);
    const signature = await wallet.signMessage(message);

    const result = await verifyWalletSignature({
      address: wallet.address,
      chainId: 11155111,
      nonce,
      signature,
      message,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('MESSAGE_CHAIN_MISMATCH');
  });

  it('rejects a nonce issued for a different address', async () => {
    const owner = Wallet.createRandom();
    const other = Wallet.createRandom();
    const { nonce } = await challengeFor(owner);
    const message = buildSignInMessage({
      address: other.address,
      chainId: CHAIN_ID,
      nonce,
      issuedAt: new Date().toISOString(),
    });
    const signature = await other.signMessage(message);

    const result = await verifyWalletSignature({
      address: other.address,
      chainId: CHAIN_ID,
      nonce,
      signature,
      message,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('NONCE_ADDRESS_MISMATCH');
  });

  it('rejects an unknown nonce outright', async () => {
    const wallet = Wallet.createRandom();
    const message = buildSignInMessage({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce: 'never-issued',
      issuedAt: new Date().toISOString(),
    });
    const signature = await wallet.signMessage(message);

    const result = await verifyWalletSignature({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce: 'never-issued',
      signature,
      message,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed signature without throwing', async () => {
    const wallet = Wallet.createRandom();
    const { nonce, message } = await challengeFor(wallet);
    const result = await verifyWalletSignature({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce,
      signature: '0xdeadbeef',
      message,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('SIGNATURE_MALFORMED');
  });

  it('expires a nonce that is past its lifetime', async () => {
    const wallet = Wallet.createRandom();
    const address = normalizeAddress(wallet.address);
    await getRepository().createNonce({
      nonce: 'expired-nonce-value-1234',
      address,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const message = buildSignInMessage({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce: 'expired-nonce-value-1234',
      issuedAt: new Date().toISOString(),
    });
    const signature = await wallet.signMessage(message);

    const result = await verifyWalletSignature({
      address: wallet.address,
      chainId: CHAIN_ID,
      nonce: 'expired-nonce-value-1234',
      signature,
      message,
    });
    expect(result.ok).toBe(false);
  });

  it('builds a message that names the address, chain, and nonce', async () => {
    const wallet = Wallet.createRandom();
    const { nonce, message } = await challengeFor(wallet);
    expect(message).toContain(wallet.address);
    expect(message).toContain(`Nonce: ${nonce}`);
    expect(message).toContain(`(${CHAIN_ID})`);
    expect(message).toMatch(/does not authorise any transaction/i);
  });
});
