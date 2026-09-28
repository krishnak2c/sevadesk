import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

/**
 * Process entrypoint. Everything that touches the network (listening socket,
 * database connection, signal handling) lives here so that `app.js` stays a
 * pure request pipeline that tests can import.
 */

let server;
let shuttingDown = false;

async function start() {
  try {
    await connectDB();
    console.log('[db] connected');

    server = app.listen(env.PORT, () => {
      console.log(`[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (err) {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
}

/**
 * Graceful shutdown.
 *
 * Stop accepting connections, close the server, drain the connection pool, then
 * exit. Without the `server.close()` step a container orchestrator (or a test
 * runner) will kill the process mid-request; without `disconnectDB()` mongoose
 * keeps the event loop alive for up to 30s and the platform sends SIGKILL.
 */
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down gracefully`);

  // Safety net: never hang forever on a stuck connection.
  const forceExit = setTimeout(() => {
    console.error('[server] graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    console.log('[server] shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('[server] error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// An unhandled rejection or uncaught exception leaves the process in an
// unknown state. Log it loudly and let the platform restart a clean process.
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandled rejection:', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  console.error('[process] uncaught exception:', err);
  process.exit(1);
});

start();
