import { notFound } from '../utils/errors.js';

/**
 * 404 catch-all. Registered AFTER every router so that "no route matched"
 * produces the same error contract as everything else instead of Express's
 * default HTML page.
 */
export function notFoundHandler(req, _res, next) {
  next(notFound(`Route ${req.method} ${req.originalUrl}`));
}
