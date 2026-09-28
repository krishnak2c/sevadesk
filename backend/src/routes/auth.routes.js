import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { login, logout, me, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../validators/auth.schema.js';
import { tooManyRequests } from '../utils/errors.js';

const router = Router();

/**
 * Brute-force protection on login: 10 attempts per IP per 15 minutes by default.
 * It is a plain in-memory store, which is correct for a single instance and
 * documented as insufficient for a multi-instance deploy in the README.
 *
 * `skipSuccessfulRequests` is on: a correct password should not consume the
 * budget, otherwise a busy receptionist gets locked out by their own typing.
 */
const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // express-rate-limit's default handler returns a bare string; rethrow so the
  // app's own error contract (code: 'rate_limited') is what the client sees.
  handler: (_req, _res, next) => {
    next(
      tooManyRequests(
        `Too many login attempts. Try again in ${Math.ceil(env.RATE_LIMIT_WINDOW_MS / 60000)} minutes.`
      )
    );
  },
});

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
