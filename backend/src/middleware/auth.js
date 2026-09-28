import { User } from '../models/User.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { JWT_COOKIE_NAME, verifyToken } from '../utils/tokens.js';

/**
 * requireAuth
 *
 * Reads the JWT from the httpOnly cookie (never from a header or the body —
 * that keeps the token out of logs and out of localStorage), verifies it, then
 * loads the user from the database.
 *
 * The DB lookup is deliberate: it means a deleted or demoted user loses access
 * immediately, rather than staying valid until their token expires. It also
 * gives handlers a real `req.user` document so RBAC and audit `actor` never
 * trust client-provided identity.
 *
 * Missing, malformed, tampered or expired token => 401 unauthorized.
 */
export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[JWT_COOKIE_NAME];
    if (!token) throw unauthorized('Authentication required. No session cookie found.');

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) throw unauthorized('Session is no longer valid.');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole(...roles)
 *
 * Must run after requireAuth. Role mismatch => 403 forbidden (the caller is
 * known, so 401 would be misleading).
 */
export function requireRole(...roles) {
  const allowed = roles.flat();

  return function roleMiddleware(req, _res, next) {
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(
        forbidden(`This action requires one of the following roles: ${allowed.join(', ')}.`),
      );
    }
    return next();
  };
}
