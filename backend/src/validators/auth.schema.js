import { z } from 'zod';
import { USER_ROLES } from '../models/User.js';

/**
 * Auth request schemas.
 *
 * Password policy is deliberately minimal (8+ chars) and enforced only at the
 * boundary: a real product would add breach-list checks and a strength meter,
 * but inventing a bespoke rule set here would just be code to defend in an
 * interview without a security benefit.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email is required')
  .email('Enter a valid email address');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long');

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(80, 'Name must be at most 80 characters long');

export const registerSchema = z.object({
  email,
  password,
  name,
  // Defaults to the least-privileged role. Privilege must be asked for
  // explicitly, never handed out by omission.
  role: z.enum(USER_ROLES).optional().default('staff'),
});

export const loginSchema = z.object({
  email,
  // No min() here: a wrong password must fail with 401 unauthorized (so we do
  // not leak "that password is too short"), not with a 400 that tells an
  // attacker their guess was malformed rather than incorrect.
  password: z.string().min(1, 'Password is required').max(128),
});
