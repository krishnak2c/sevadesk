/**
 * The one place the frontend talks to the network.
 *
 * Every module in `src/api/` builds on `request()`, which owns four concerns:
 *   1. the base URL (from VITE_API_URL),
 *   2. cookie auth (`credentials: 'include'` — the JWT lives in an httpOnly
 *      cookie, so JavaScript can never read it),
 *   3. parsing the backend's error envelope into a typed `ApiError`, and
 *   4. telling the auth layer when the session has been rejected (401).
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/**
 * Called with the ApiError whenever the server answers 401. AuthContext
 * registers a handler so an expired cookie drops the app to the login screen
 * no matter which request discovered it.
 */
let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/** A failure the UI can branch on: `code` for logic, `details` for forms. */
export class ApiError extends Error {
  constructor({ code, message, details = [], status = 0 }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }

  /** The server could not be reached at all (backend down, CORS, offline). */
  get isOffline() {
    return this.code === 'network_error';
  }

  /** { fieldName: message } — ready to render next to matching inputs. */
  fieldErrors() {
    return this.details.reduce((acc, detail) => {
      if (detail && detail.path) acc[detail.path] = detail.message;
      return acc;
    }, {});
  }
}

/**
 * Response envelopes: the written contract and the deployed backend disagree
 * (`{user}` vs `{data: user}`, bare array vs `{data: []}`). Normalising here
 * keeps that disagreement out of every component — the UI always sees the
 * inner value. Delete this once the contract settles on one shape.
 */
export function unwrap(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

/** Drop empty values so `?q=&status=open` never becomes an invalid query. */
export function withQuery(path, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== undefined && value !== null) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function request(path, { method = 'GET', body, signal } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    if (cause.name === 'AbortError') throw cause;
    throw new ApiError({
      code: 'network_error',
      message: 'Cannot reach the SevaDesk API. Check that the backend is running.',
    });
  }

  const payload = await readPayload(response);
  if (response.ok) return payload;

  // Every backend failure is { error: { code, message, details } }.
  const envelope = payload && typeof payload === 'object' ? payload.error : null;
  const error = new ApiError({
    code: envelope?.code ?? 'internal_error',
    message: envelope?.message ?? `The server responded with status ${response.status}.`,
    details: Array.isArray(envelope?.details) ? envelope.details : [],
    status: response.status,
  });

  // 401 = the httpOnly cookie is missing or expired. Only treat it as "session
  // ended" for authenticated endpoints, never for a failed login attempt.
  if (response.status === 401 && path !== '/api/auth/login' && unauthorizedHandler) {
    unauthorizedHandler(error);
  }

  throw error;
}
