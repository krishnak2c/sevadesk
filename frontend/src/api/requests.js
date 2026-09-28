import { request, unwrap, withQuery } from './client';

/**
 * Query params for GET /api/requests.
 * Normalised to `{ data, pagination }` even if the envelope changes shape.
 */
export async function listRequests(params, { signal } = {}) {
  const payload = await request(withQuery('/api/requests', params), { signal });

  if (Array.isArray(payload)) return { data: payload, pagination: null };

  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination ?? null,
  };
}

export async function getRequest(id, { signal } = {}) {
  return unwrap(await request(`/api/requests/${id}`, { signal }));
}

export async function createRequest(body) {
  return unwrap(await request('/api/requests', { method: 'POST', body }));
}

export async function updateRequest(id, body) {
  return unwrap(await request(`/api/requests/${id}`, { method: 'PATCH', body }));
}

export async function deleteRequest(id) {
  return unwrap(await request(`/api/requests/${id}`, { method: 'DELETE' }));
}

/**
 * Move a request one step along open → in-progress → done → billed.
 *
 * The transition endpoint names the target field `toStatus` in the deployed
 * backend, while the written contract calls it `status`. Zod strips unknown
 * keys, so we send both spellings and either contract validates. The UI only
 * ever offers the single legal next status — the server re-checks anyway.
 */
export async function advanceStatus(id, { status, note }) {
  const payload = { toStatus: status, status };
  if (note && note.trim()) payload.note = note.trim();

  return unwrap(await request(`/api/requests/${id}/status`, { method: 'PATCH', body: payload }));
}

/** Append-only audit trail: `{ data: [...] }` (or a bare array). */
export async function listRequestEvents(id, { signal } = {}) {
  const payload = await request(`/api/requests/${id}/events`, { signal });
  const events = unwrap(payload);
  return Array.isArray(events) ? events : [];
}
