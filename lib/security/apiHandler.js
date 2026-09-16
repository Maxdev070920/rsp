import { NextResponse } from 'next/server';
import { AppError, tooManyRequests } from './errors';
import { clientKey, rateLimit } from './rateLimit';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Same-origin check for state-changing requests.
 *
 * Session cookies are SameSite=Lax, which already blocks cross-site form POSTs;
 * this is the second layer, and it also rejects the `null` origin that some
 * sandboxed-iframe attacks produce.
 */
function assertSameOrigin(request) {
  if (!MUTATING.has(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin) return; // non-browser client (curl, tests)
  const host = request.headers.get('host');
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError('Request origin could not be verified.', { code: 'CSRF_BLOCKED', status: 403 });
  }
  if (originHost !== host) {
    throw new AppError('Cross-origin request blocked.', { code: 'CSRF_BLOCKED', status: 403 });
  }
}

export function jsonError(error) {
  const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
  const isServer = status >= 500;
  if (isServer) {
    // Log the real cause server-side; never leak internals to the client.
    console.error('[api]', error);
  }
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error?.code || 'INTERNAL_ERROR',
        message: isServer ? 'Something went wrong on our side. Please try again.' : error.message,
        details: isServer ? undefined : error.details || undefined,
      },
    },
    { status }
  );
}

export const jsonOk = (data, init) => NextResponse.json({ ok: true, ...data }, init);

/**
 * Wraps a route handler with origin checking, rate limiting, body parsing and
 * uniform error serialisation.
 */
export function withApi(handler, { limit = 60, windowMs = 60_000, name = 'api' } = {}) {
  return async (request, context) => {
    try {
      assertSameOrigin(request);

      const result = rateLimit(clientKey(request, name), limit, windowMs);
      if (!result.allowed) {
        const error = tooManyRequests();
        const response = jsonError(error);
        response.headers.set('Retry-After', String(result.retryAfterSeconds ?? 60));
        return response;
      }

      let body = null;
      if (MUTATING.has(request.method)) {
        const text = await request.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            throw new AppError('Request body must be valid JSON.', { code: 'BAD_JSON', status: 400 });
          }
        }
      }

      const response = await handler({ request, context, body });
      return response instanceof NextResponse ? response : jsonOk(response);
    } catch (error) {
      return jsonError(error);
    }
  };
}
