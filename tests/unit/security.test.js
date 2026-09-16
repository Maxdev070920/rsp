import { beforeEach, describe, expect, it } from 'vitest';
import {
  authSchema,
  createRunSchema,
  decisionSchema,
  deletionSchema,
  parseBody,
  playRoundSchema,
  profileSchema,
  walletVerifySchema,
} from '@/lib/security/validation';
import { rateLimit, resetRateLimits } from '@/lib/security/rateLimit';
import { createGuestToken, verifyGuestToken } from '@/lib/auth/guestSession';
import { readIdempotencyHeader } from '@/lib/security/idempotency';

describe('input validation', () => {
  it('accepts a valid run request and rejects unknown rooms or champions', () => {
    expect(parseBody(createRunSchema, { roomKey: 'practice', championKey: 'pyra' }).roomKey).toBe('practice');
    expect(() => parseBody(createRunSchema, { roomKey: 'atlantis', championKey: 'pyra' })).toThrow();
    expect(() => parseBody(createRunSchema, { roomKey: 'practice', championKey: 'godzilla' })).toThrow();
  });

  it('accepts only the three moves', () => {
    expect(parseBody(playRoundSchema, { move: 'rock' }).move).toBe('rock');
    expect(() => parseBody(playRoundSchema, { move: 'lizard' })).toThrow();
    expect(() => parseBody(playRoundSchema, { move: '<script>alert(1)</script>' })).toThrow();
  });

  it('accepts only claim or continue as a decision', () => {
    expect(parseBody(decisionSchema, { decision: 'claim' }).decision).toBe('claim');
    expect(() => parseBody(decisionSchema, { decision: 'win' })).toThrow();
  });

  it('constrains display names to safe characters and lengths', () => {
    expect(parseBody(profileSchema, { displayName: 'Arena Rat_01' }).displayName).toBe('Arena Rat_01');
    expect(() => parseBody(profileSchema, { displayName: 'a' })).toThrow();
    expect(() => parseBody(profileSchema, { displayName: 'x'.repeat(40) })).toThrow();
    expect(() => parseBody(profileSchema, { displayName: '<img src=x onerror=1>' })).toThrow();
  });

  it('requires the exact deletion confirmation phrase', () => {
    expect(parseBody(deletionSchema, { confirmation: 'DELETE MY ACCOUNT' }).confirmation).toBe('DELETE MY ACCOUNT');
    expect(() => parseBody(deletionSchema, { confirmation: 'delete my account' })).toThrow();
    expect(() => parseBody(deletionSchema, {})).toThrow();
  });

  it('validates wallet payload shapes strictly', () => {
    const base = {
      address: '0x1111111111111111111111111111111111111111',
      chainId: 2021,
      nonce: 'a'.repeat(24),
      signature: `0x${'a'.repeat(130)}`,
      message: 'x'.repeat(40),
    };
    expect(parseBody(walletVerifySchema, base).chainId).toBe(2021);
    expect(() => parseBody(walletVerifySchema, { ...base, address: '0x123' })).toThrow();
    expect(() => parseBody(walletVerifySchema, { ...base, signature: '0xshort' })).toThrow();
  });

  it('enforces a minimum password length', () => {
    expect(() => parseBody(authSchema, { email: 'a@b.co', password: 'short' })).toThrow();
    expect(parseBody(authSchema, { email: 'a@b.co', password: 'a-long-enough-passphrase' }).email).toBe('a@b.co');
  });

  it('reports the failing field path for the client', () => {
    try {
      parseBody(createRunSchema, { roomKey: 'nope', championKey: 'pyra' });
      expect.unreachable();
    } catch (error) {
      expect(error.status).toBe(400);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.details[0].path).toBe('roomKey');
    }
  });
});

describe('rate limiting', () => {
  beforeEach(() => resetRateLimits());

  it('allows requests up to the limit and blocks after it', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(rateLimit('test-key', 5).allowed).toBe(true);
    }
    const blocked = rateLimit('test-key', 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks each key independently', () => {
    rateLimit('key-a', 1);
    expect(rateLimit('key-a', 1).allowed).toBe(false);
    expect(rateLimit('key-b', 1).allowed).toBe(true);
  });

  it('resets once the window has elapsed', () => {
    expect(rateLimit('window-key', 1, 1).allowed).toBe(true);
    const before = Date.now();
    while (Date.now() - before < 3) {
      // Busy-wait past the 1ms window without an async timer.
    }
    expect(rateLimit('window-key', 1, 1).allowed).toBe(true);
  });
});

describe('guest sessions', () => {
  it('issues a signed token that verifies back to its id', () => {
    const { id, token } = createGuestToken();
    expect(verifyGuestToken(token)).toBe(id);
  });

  it('rejects a tampered token', () => {
    const { id, token } = createGuestToken();
    const [, signature] = token.split(`${id}.`);
    expect(verifyGuestToken(`guest_forged.${signature}`)).toBeNull();
    expect(verifyGuestToken(`${id}.badsignature`)).toBeNull();
    expect(verifyGuestToken('not-a-token')).toBeNull();
    expect(verifyGuestToken(undefined)).toBeNull();
  });

  it('rejects an id that does not carry the guest prefix', () => {
    expect(verifyGuestToken('admin_1.signature')).toBeNull();
  });
});

describe('idempotency header parsing', () => {
  const request = (value) => ({ headers: { get: () => value } });

  it('accepts a well-formed key and rejects anything else', () => {
    expect(readIdempotencyHeader(request('abc-123_XYZ456'))).toBe('abc-123_XYZ456');
    expect(readIdempotencyHeader(request('short'))).toBeNull();
    expect(readIdempotencyHeader(request('has spaces and ;'))).toBeNull();
    expect(readIdempotencyHeader(request(null))).toBeNull();
  });
});
