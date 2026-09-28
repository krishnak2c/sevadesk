import jwt from 'jsonwebtoken';
import { env, isProd } from '../config/env.js';
import { unauthorized } from './errors.js';

export const JWT_COOKIE_NAME = 'sevadesk_token';

const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** '7d' -> 604800000, so the cookie can never outlive the token it carries. */
export function parseDurationToMs(duration) {
  const match = /^(\d+)\s*([smhd])$/.exec(String(duration).trim());
  if (!match) throw new Error(`Unsupported duration format: "${duration}". Use e.g. "15m", "24h", "7d".`);
  return Number(match[1]) * UNITS[match[2]];
}

export const TOKEN_TTL_MS = parseDurationToMs(env.JWT_EXPIRES_IN);

/**
 * The JWT lives in an httpOnly cookie, never in a response body and never in
 * localStorage. That is the single most important line in this file: JS running
 * in the browser cannot read the token, so an XSS bug cannot exfiltrate it.
 *
 * KNOWN FOLLOW-UP: once the Vercel frontend is served from a different origin
 * than this API, `sameSite: 'lax'` will stop the browser sending the cookie on
 * cross-site XHR. The fix is `sameSite: 'none'` + `secure: true` (which
 * browsers only honour over HTTPS) plus a real, non-wildcard CORS origin. That
 * cannot be enabled yet because a production deployment without HTTPS would
 * silently drop every cookie, so it is deliberately left as a documented
 * follow-up rather than shipped half-configured.
 */
export const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/',
  maxAge: TOKEN_TTL_MS,
};

/**
 * Same attribute set as `cookieOptions` but with maxAge 0, which is how you
 * tell a browser to delete a cookie.
 *
 * Every attribute that was set on the way in MUST be repeated here, otherwise
 * the browser treats the deletion as a different cookie and the original
 * survives. `path`, `sameSite` and `secure` are therefore spread from
 * `cookieOptions` rather than retyped.
 *
 * Note: no `expires` option. `res.clearCookie` deprecates it (Express now
 * derives expiry from `maxAge`), and passing it emits a
 * "Passing \"options.expires\" is deprecated" warning while adding nothing:
 * `maxAge: 0` alone already expires the cookie immediately.
 */
export const clearedCookieOptions = {
  ...cookieOptions,
  maxAge: 0,
};

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

/** Verify + return the payload, or throw a 401 ApiError. Never leaks the reason. */
export function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw unauthorized('Session is invalid or has expired.');
  }
}

/** The public projection of a user — the only shape ever sent to a client. */
export function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
