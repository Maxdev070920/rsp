/**
 * Browser-side API client.
 *
 * Every response is normalised to `{ ok, ...data }` or a thrown ApiError with a
 * message that is safe to show a player.
 */

export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code || 'REQUEST_FAILED';
    this.status = status || 0;
    this.details = details || null;
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Network unreachable. Check your connection and try again.', { code: 'NETWORK_ERROR' });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.ok === false) {
    throw new ApiError(payload?.error?.message || `Request failed (${response.status}).`, {
      code: payload?.error?.code,
      status: response.status,
      details: payload?.error?.details,
    });
  }

  return payload;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
