import { createHash } from 'node:crypto';
import { getRepository } from '@/lib/database/repository';

/**
 * Idempotency for money-adjacent actions (claim, mint).
 *
 * The key is scoped to the actor *and* the action so a stolen key from one user
 * cannot replay another user's claim.
 */
export function idempotencyKey({ userId, action, resourceId, clientKey = null }) {
  const raw = `${userId || 'anon'}|${action}|${resourceId}|${clientKey || ''}`;
  return createHash('sha256').update(raw).digest('hex');
}

export async function withIdempotency(key, produce, { ttlMs = 15 * 60 * 1000 } = {}) {
  const repo = getRepository();
  const cached = await repo.getIdempotentResult(key);
  if (cached) return { result: cached, replayed: true };

  const result = await produce();
  await repo.saveIdempotentResult(key, result, ttlMs);
  return { result, replayed: false };
}

export const readIdempotencyHeader = (request) => {
  const header = request.headers.get('idempotency-key');
  if (!header) return null;
  return /^[A-Za-z0-9_-]{8,128}$/.test(header) ? header : null;
};
