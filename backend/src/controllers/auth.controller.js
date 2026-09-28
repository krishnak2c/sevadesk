import { compare } from 'bcryptjs';
import { User } from '../models/User.js';
import { conflict, unauthorized } from '../utils/errors.js';
import { JWT_COOKIE_NAME, cookieOptions, clearedCookieOptions, signToken, publicUser } from '../utils/tokens.js';

/**
 * A real bcrypt hash of a random string, used only to burn roughly the same
 * CPU as a genuine password check when the email is unknown. Not a secret —
 * the password behind it is discarded.
 */
const DUMMY_HASH = '$2b$12$rCaDMvJqVVeAAEPZEZiuNuS.5/nrdzsyuPAv1HsaW1yxigaPxqlS';

/** Attaches the session cookie to the response. The token never appears in the body. */
function setSessionCookie(res, user) {
  res.cookie(JWT_COOKIE_NAME, signToken(user), cookieOptions);
}

/**
 * POST /api/auth/register
 * 201 + session cookie. The only way to obtain the `owner` role is to ask for
 * it here; in a real deployment this endpoint would be owner-only or disabled
 * after initial setup, which is called out in the README.
 */
export async function register(req, res) {
  const { email, password, name, role } = req.body;

  // Checked up front purely to return a friendlier 409 than a duplicate-key
  // error. The unique index is still the real guarantee (see errorHandler's
  // 11000 -> conflict mapping) — this check alone is racy.
  const existing = await User.exists({ email });
  if (existing) throw conflict('An account with that email already exists.', [
    { path: 'email', message: 'Already registered' },
  ]);

  const user = await User.create({ email, name, role, password });

  setSessionCookie(res, user);
  res.status(201).json({ data: publicUser(user) });
}

/** POST /api/auth/login — 200 + session cookie. */
export async function login(req, res) {
  const { email, password } = req.body;

  // passwordHash is `select: false` on the schema, so it must be requested
  // explicitly here. Comparing a dummy hash when the user does not exist keeps
  // the response time roughly constant, so the endpoint cannot be used to
  // enumerate registered email addresses.
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    // Burn comparable CPU so a missing account and a wrong password take
    // roughly the same time, which stops this endpoint being used to
    // enumerate registered email addresses.
    await compare(password, DUMMY_HASH);
    throw unauthorized('Email or password is incorrect.');
  }

  const ok = await user.verifyPassword(password);
  if (!ok) throw unauthorized('Email or password is incorrect.');

  setSessionCookie(res, user);
  res.status(200).json({ data: publicUser(user) });
}

/** POST /api/auth/logout — 200, cookie cleared. Safe to call without a session. */
export function logout(_req, res) {
  res.clearCookie(JWT_COOKIE_NAME, clearedCookieOptions);
  res.status(200).json({ data: { success: true } });
}

/** GET /api/auth/me — 200, the current user. */
export function me(req, res) {
  res.status(200).json({ data: publicUser(req.user) });
}
