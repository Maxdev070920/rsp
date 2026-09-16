import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/config/server-env';

export const GUEST_COOKIE = 'era_guest';
const GUEST_TTL_DAYS = 30;

// Falls back to a process-lifetime key so guest play works with zero config.
// Guest cookies then stop validating across restarts, which is acceptable for
// an anonymous, non-minting session but is flagged in the README.
const secret = serverEnv.sessionSecret || (globalThis.__ERA_SESSION_KEY__ ||= randomBytes(32).toString('hex'));

const sign = (value) => createHmac('sha256', secret).update(value).digest('base64url');

export function createGuestToken() {
  const id = `guest_${randomUUID()}`;
  return { id, token: `${id}.${sign(id)}` };
}

export function verifyGuestToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const index = token.lastIndexOf('.');
  const id = token.slice(0, index);
  const signature = token.slice(index + 1);
  if (!id.startsWith('guest_')) return null;

  const expected = sign(id);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  return id;
}

export const guestCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: GUEST_TTL_DAYS * 24 * 60 * 60,
};
