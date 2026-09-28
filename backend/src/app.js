import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';

import { env, isProd, allowedOrigins } from './config/env.js';
import { dbHealthState } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import authRoutes from './routes/auth.routes.js';
import requestRoutes from './routes/request.routes.js';

/**
 * Express application assembly.
 *
 * This module deliberately does NOT call listen(). `server.js` owns the
 * listening socket and the database connection; the app itself is just a
 * request pipeline, which is what makes it importable from a test file without
 * opening a port.
 */
const app = express();

// Behind a reverse proxy (Vercel/Render/nginx) `req.ip` and `req.secure` are
// only correct if Express trusts exactly one proxy hop. `1` is deliberate:
// `true` would let a client spoof X-Forwarded-For and defeat the rate limiter.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

/**
 * CORS with an explicit allow-list and `credentials: true`.
 *
 * This combination is required for cookie auth to work at all: the browser
 * refuses to store a cross-origin cookie unless the response says
 * `Access-Control-Allow-Credentials: true`, and it refuses to honour that
 * alongside a wildcard origin. `origin: '*'` + cookies = permanently broken
 * auth. Never "simplify" this to '*'.
 *
 * NOTE / known follow-up: the production frontend will be served from a
 * different site than the API. Once that happens the session cookie also needs
 * `sameSite: 'none'` + `secure: true` (already wired in utils/tokens.js) and
 * the deployed API must be HTTPS. See README "What broke / what is next".
 */
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and non-browser clients (curl, health checks,
      // server-to-server) send no Origin header at all. Let them through:
      // CORS is a browser policy, not an authentication mechanism.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use(morgan(isProd ? 'combined' : 'dev'));

/**
 * GET /health — no auth, and it must never throw. The DB state is read from
 * the mongoose connection's readyState rather than by issuing a ping, so a
 * database outage produces a 200 with `db: 'disconnected'` instead of a
 * 500 that would make a load balancer pull a perfectly healthy process out of
 * rotation.
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    db: dbHealthState(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

// 404, then the central error handler LAST. Order matters: the error handler
// only runs for errors raised by middleware/routes registered before it.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
