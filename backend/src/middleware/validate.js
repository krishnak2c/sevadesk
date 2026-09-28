/**
 * validate(schema, source = 'body')
 *
 * Runs a zod schema against the chosen request segment and REPLACES that
 * segment with the parsed result. Replacing (rather than mutating) matters:
 * it means controllers consume coerced, defaulted and stripped values, and
 * can never accidentally trust a raw string that zod was meant to normalise.
 *
 * A ZodError is forwarded untouched to `middleware/errorHandler.js`, which is
 * the single place that maps library errors onto the wire contract. Wrapping
 * it here would duplicate that mapping logic in two places.
 *
 * `source` is a single segment ('body' | 'query' | 'params') or an array of
 * them when one schema spans several segments.
 */
export function validate(schema, source = 'body') {
  const segments = Array.isArray(source) ? source : [source];

  return function validateMiddleware(req, _res, next) {
    try {
      for (const segment of segments) {
        const parsed = schema.parse(req[segment]);
        if (segment === 'query') {
          // Express 5 makes req.query a getter-only property. Writing the parsed
          // value to a separate field keeps this middleware working on both 4
          // and 5, and avoids mutating the parsed object the user handed us.
          req.validatedQuery = parsed;
        } else {
          req[segment] = parsed;
        }
      }
      next();
    } catch (err) {
      // Forwarded untouched; the error handler owns the wire mapping.
      return next(err);
    }
  };
}
