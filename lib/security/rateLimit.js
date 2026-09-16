/**
 * Fixed-window rate limiter.
 *
 * Process-local, which is correct for a single Node instance and for local
 * development. A multi-instance deployment must move this to a shared store
 * (Redis / Supabase) — see "Known limitations" in the README.
 */

const buckets = globalThis.__ERA_RATE_BUCKETS__ || new Map();
globalThis.__ERA_RATE_BUCKETS__ = buckets;

const WINDOW_MS = 60_000;

export function rateLimit(key, limit = 60, windowMs = WINDOW_MS) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Best-effort client identity for limiting. Never used for authorisation. */
export function clientKey(request, suffix = '') {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'local';
  return `${ip}:${suffix}`;
}

export function resetRateLimits() {
  buckets.clear();
}
