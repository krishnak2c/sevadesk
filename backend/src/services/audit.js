import { RequestEvent } from '../models/RequestEvent.js';

/**
 * Audit trail helper.
 *
 * RequestEvent is the single source of truth for status history — the Request
 * document deliberately does NOT keep its own statusHistory array, because two
 * copies of the same state drift the moment one write fails.
 *
 * Events are append-only: the model throws on update/delete operations, so a
 * status change can never be rewritten after the fact.
 */
export async function recordRequestEvent({ request, actor, fromStatus, toStatus, note }) {
  return RequestEvent.create({
    request: request._id ?? request,
    actor: actor?._id ?? actor,
    fromStatus,
    toStatus,
    note,
    at: new Date(),
  });
}

/** Full history for one request, oldest first. */
export async function listRequestEvents(requestId) {
  return RequestEvent.find({ request: requestId })
    .sort({ at: 1, _id: 1 })
    .populate('actor', 'name email role')
    .lean();
}
