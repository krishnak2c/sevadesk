import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError, ERROR_CODES } from '../utils/errors.js';
import { isProd, isTest } from '../config/env.js';

/**
 * The only place in the app that decides what an error looks like on the wire.
 * Registered LAST in app.js — Express resolves error middleware in
 * registration order, so anything thrown after this point falls through to here.
 */

/** Zod issues -> the contract's `details` array. */
function fromZod(err) {
  const details = err.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
  return new ApiError(400, ERROR_CODES.INVALID_INPUT, 'Request validation failed.', details);
}

/** @param {unknown} err */
export function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) return fromZod(err);

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return new ApiError(400, ERROR_CODES.INVALID_INPUT, 'Document validation failed.', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    // Almost always a malformed :id in the path. Client's fault, not a 500.
    return new ApiError(
      400,
      ERROR_CODES.INVALID_INPUT,
      `Invalid value for "${err.path}".`,
      [{ path: err.path, message: `Expected ${err.kind}, received "${err.stringValue}".` }],
    );
  }

  // Duplicate key — most likely re-registering an existing email.
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyPattern ?? err.keyValue ?? {});
    const label = fields.length ? fields.join(', ') : 'value';
    return new ApiError(409, ERROR_CODES.CONFLICT, `Duplicate ${label}.`, [
      ...fields.map((f) => ({ path: f, message: `${f} is already in use.` })),
    ]);
  }

  // express.json() body-parse failures.
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return new ApiError(400, ERROR_CODES.INVALID_INPUT, 'Request body is not valid JSON.');
  }
  if (err?.type === 'entity.too.large') {
    return new ApiError(413, ERROR_CODES.INVALID_INPUT, 'Request body is too large.');
  }

  return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
}

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity (4 args).
export function errorHandler(err, _req, res, _next) {
  const apiError = normalizeError(err);

  if (apiError.status >= 500) {
    // Log server-side always; never leak the message or stack to the client in production.
    console.error('[error]', err);
  }

  const body = apiError.toJSON();

  if (apiError.status >= 500 && !isProd) {
    // Stack is a development affordance only. In production the response is
    // exactly { error: { code, message } } and nothing more.
    body.error.stack = err instanceof Error ? err.stack : String(err);
  }

  if (apiError.status === 429 && isTest) {
    // Makes the retry contract observable in tests without sleeping.
    body.error.retryAfterMs = res.getHeader('Retry-After');
  }

  res.status(apiError.status).json(body);
}
