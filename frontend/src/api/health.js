import { request } from './client';

/**
 * GET /health is unauthenticated and deliberately answers 200 even when the
 * database is gone (`db: 'disconnected'`), so the body has to be read
 * defensively: an outage must degrade the indicator, never crash the app.
 */
export async function checkHealth() {
  try {
    return interpret(await request('/health'));
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return {
      state: 'offline',
      label: 'API unreachable',
      detail: error.message,
    };
  }
}

function interpret(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const status = String(body.status ?? '').toLowerCase();
  const db = String(body.db ?? body.database ?? '').toLowerCase();

  if (['error', 'fail', 'degraded', 'down', 'unhealthy'].includes(status)) {
    return { state: 'degraded', label: 'API degraded', detail: `status: ${status}` };
  }

  if (['disconnected', 'down', 'error', 'unavailable'].includes(db)) {
    return {
      state: 'degraded',
      label: 'Database degraded',
      detail: 'The API is up but the database is disconnected — data may be stale.',
    };
  }

  return { state: 'ok', label: 'API connected', detail: 'Backend and database are healthy.' };
}
