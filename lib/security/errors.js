export class AppError extends Error {
  constructor(message, { code = 'APP_ERROR', status = 400, details = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(message, { code: 'BAD_REQUEST', status: 400, details });
export const unauthorized = (message = 'Sign in to continue.') => new AppError(message, { code: 'UNAUTHORIZED', status: 401 });
export const forbidden = (message = 'You do not have access to this resource.') => new AppError(message, { code: 'FORBIDDEN', status: 403 });
export const notFound = (message = 'Not found.') => new AppError(message, { code: 'NOT_FOUND', status: 404 });
export const conflict = (message, code = 'CONFLICT') => new AppError(message, { code, status: 409 });
export const tooManyRequests = (message = 'Too many requests. Slow down and try again shortly.') =>
  new AppError(message, { code: 'RATE_LIMITED', status: 429 });
