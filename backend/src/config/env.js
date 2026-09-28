import 'dotenv/config';
import { z } from 'zod';

/**
 * Fail fast on boot. There is no "unvalidated env" path — every consumer
 * imports `env` and gets typed, defaulted, known-good values.
 */

const NODE_ENVS = ['development', 'test', 'production'];
const isProduction = process.env.NODE_ENV === 'production';

const DEV_JWT_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

/**
 * An insecure, loudly-labelled fallback so that `node -e "import('./src/app.js')"`
 * and the test suite work on a clean checkout with no .env file. Production
 * never gets this branch — see the .superRefine below.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(NODE_ENVS).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/sevadesk'),

    // Auth. `dev-only-insecure-secret-do-not-use-in-production` is 51 chars, so
    // it satisfies the 32-char production floor too — the guard below is what
    // actually blocks production, not the length.
    JWT_SECRET: z.string().default(DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
    REQUEST_CREATE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(60),

    ALLOW_PROD_SEED: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
  })
  .superRefine((value, ctx) => {
    if (!isProduction) return;

    if (value.JWT_SECRET === DEV_JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET is missing or is the development fallback. Generate one with `openssl rand -hex 32` (or `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`).',
      });
    }

    if (value.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters in production.',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
  // Thrown at import time on purpose: a process with unsafe config must not
  // start a listener and accept traffic.
  throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** Comma-separated ALLOWED_ORIGINS -> array, blanks dropped. */
export const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
