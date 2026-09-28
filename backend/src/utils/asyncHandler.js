/**
 * asyncHandler(fn)
 *
 * Express 4 does NOT catch rejected promises from route handlers: an async
 * handler that throws produces a request that hangs until the client times
 * out, and the central error handler never sees the error. (Express 5 fixes
 * this natively; this project is pinned to Express 4 for host compatibility.)
 *
 * Wrapping every async handler in this one function forwards rejections to
 * `next(err)`, which is the whole error-handling contract the app relies on.
 *
 * Usage:  router.get('/', asyncHandler(controller.listRequests))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
