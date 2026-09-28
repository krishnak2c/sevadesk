/**
 * Central error contract.
 *
 * Every error leaving the API looks like:
 *   { "error": { "code": "...", "message": "...", "details": [...] } }
 *
 * Controllers and services throw `ApiError` (or let a known library error
 * bubble up); `middleware/errorHandler.js` is the only place that decides what
 * the wire format is. That keeps error shape out of every route handler.
 */

export const ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'invalid_input',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  INVALID_TRANSITION: 'invalid_transition',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rate_limited',
  INTERNAL_ERROR: 'internal_error',
});

/** Error carrying an HTTP status + a machine-readable code from the contract above. */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} code One of ERROR_CODES
   * @param {string} message Human-readable, safe to show a client
   * @param {Array<{path: string, message: string}>} [details] Field-level detail
   */
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  /** Serialise to the wire format. Stacks are attached by the error handler, not here. */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export const badRequest = (message, details) =>
  new ApiError(400, ERROR_CODES.INVALID_INPUT, message, details);

export const invalidTransition = (message, details) =>
  new ApiError(400, ERROR_CODES.INVALID_TRANSITION, message, details);

export const unauthorized = (message = 'Authentication required.') =>
  new ApiError(401, ERROR_CODES.UNAUTHORIZED, message);

export const forbidden = (message = 'You do not have permission to perform this action.') =>
  new ApiError(403, ERROR_CODES.FORBIDDEN, message);

export const notFound = (resource = 'Resource') =>
  new ApiError(404, ERROR_CODES.NOT_FOUND, `${resource} not found.`);

export const conflict = (message, details) =>
  new ApiError(409, ERROR_CODES.CONFLICT, message, details);

export const tooManyRequests = (message = 'Too many requests. Please try again later.') =>
  new ApiError(429, ERROR_CODES.RATE_LIMITED, message);

export const internalError = (message = 'Something went wrong.') =>
  new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
