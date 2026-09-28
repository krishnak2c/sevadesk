import { request, unwrap } from './client';

/**
 * The cookie is httpOnly, so these calls are the only way the UI learns
 * whether a session exists. `fetchCurrentUser()` is called once on boot.
 */

function readUser(payload) {
  const inner = unwrap(payload);
  if (inner && typeof inner === 'object' && inner.id) return inner;
  // Contract spelling: { user: {...} }
  if (payload && payload.user && payload.user.id) return payload.user;
  return null;
}

export async function fetchCurrentUser() {
  const payload = await request('/api/auth/me');
  const user = readUser(payload);
  if (!user) {
    throw new Error('Session endpoint returned no user');
  }
  return user;
}

export async function login({ email, password }) {
  const payload = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return readUser(payload);
}

export async function register({ name, email, password }) {
  const payload = await request('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  return readUser(payload);
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}
