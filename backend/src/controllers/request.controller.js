import mongoose from 'mongoose';
import { ALLOWED_TRANSITIONS, Request, isAllowedTransition, normalizePhone } from '../models/Request.js';
import { User } from '../models/User.js';
import { recordRequestEvent, listRequestEvents } from '../services/audit.js';
import { notFound, invalidTransition, badRequest, internalError } from '../utils/errors.js';

/**
 * User fields that are safe to expose. Never send a whole User document from a
 * request route — the exclusion is structural (a projection), not a
 * `.delete(passwordHash)` afterthought.
 *
 * Two spellings because the two code paths are different engines:
 *   - `select` is a mongoose projection used by populate().
 *   - `$project` is the aggregation equivalent, which also renames `_id` to `id`
 *     so a populated user looks identical whether it came from a `.find()` or
 *     from a `$lookup` inside the list aggregation.
 */
const USER_PUBLIC_SELECT = 'name email';
const USER_PUBLIC_PROJECTION = { _id: 0, id: '$_id', name: 1, email: 1 };

/**
 * Normalise a Request for the wire: expose `id` (never `_id`), drop `__v`, and
 * apply the same treatment to the nested assignee/createdBy references.
 *
 * This exists because three different mongoose paths produce three different
 * raw shapes — a hydrated document (toJSON applies the model transform), a
 * `.lean()` document (no transform at all, so it keeps `_id`), and an
 * aggregation result (plain JS object, `_id` and no transform). All three must
 * serialise identically, or a client cannot use `r.id` consistently.
 */
function toPublicRequest(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };

  const { _id, __v, assignee, createdBy, ...rest } = plain;
  const out = { id: _id !== undefined ? String(_id) : rest.id, ...rest };

  if (assignee) out.assignee = toPublicUserRef(assignee);
  if (createdBy) out.createdBy = toPublicUserRef(createdBy);
  return out;
}

/** Projected user reference, always shaped { id, name, email } or null. */
function toPublicUserRef(user) {
  if (!user) return null;
  const { _id, __v, ...rest } = user;
  return { id: _id !== undefined ? String(_id) : rest.id, ...rest };
}

/** Escape a user string before it is used inside a RegExp. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/requests
 *
 * The list endpoint, written as a single `$facet` aggregation on purpose:
 *
 *   - One round trip returns both the page of rows and the total count.
 *     Two queries (find + countDocuments) can disagree under concurrent writes
 *     and double the latency.
 *   - Sorting/filtering happens in Mongo, not in Node, so page 500 costs the
 *     same as page 1. `{ status: 1, createdAt: -1 }` serves the common case
 *     straight from the index.
 *   - `$lookup` with a projection pipeline embeds only `name` and `email` for
 *     assignee/createdBy. A password hash can never leak through this route,
 *     because it is never selected in the first place — the exclusion is
 *     structural, not a `.delete()` afterthought.
 */
export async function listRequests(req, res) {
  const { page, limit, status, priority, q, sort } = req.validatedQuery;
  const take = Math.min(limit, 100); // defensive: the schema already caps this at 100
  const skip = (page - 1) * take;
  const sortDirection = sort === 'createdAt' ? 1 : -1;

  const match = {};
  if (status) match.status = status;
  if (priority) match.priority = priority;

  // Search. A query made only of digits is treated as a phone prefix: the text
  // index tokenises "919876543210" as one token, so `$text` cannot match the
  // first 6 digits a receptionist would actually type. An anchored regex on
  // the indexed `phoneNormalized` field serves that case, and anything
  // non-numeric falls through to full-text search on name.
  let sortStage = { createdAt: sortDirection };
  if (q) {
    if (/^\d+$/.test(q)) {
      match.phoneNormalized = { $regex: `^${escapeRegex(q)}` };
    } else {
      match.$text = { $search: q };
      // Relevance first, then the requested chronological order as a tie-break.
      sortStage = { score: { $meta: 'textScore' }, createdAt: sortDirection };
    }
  }

  const [result] = await Request.aggregate([
    { $match: match },
    {
      $facet: {
        data: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: take },
          {
            $lookup: {
              from: 'users',
              localField: 'assignee',
              foreignField: '_id',
              as: 'assignee',
              pipeline: [{ $project: USER_PUBLIC_PROJECTION }],
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [{ $project: USER_PUBLIC_PROJECTION }],
            },
          },
          // $lookup always yields an array; collapse it to a single object (or
          // null) so the response shape matches a normal populate().
          { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
          // An aggregation result is a plain object: it bypasses the schema's
          // toJSON transform, so rename _id -> id here to keep the list
          // response identical to POST/GET-one. Without this, a client that
          // reads r.id gets `undefined` on the list endpoint only.
          { $addFields: { id: '$_id' } },
          { $project: { _id: 0, __v: 0 } },
        ],
        meta: [{ $count: 'total' }],
      },
    },
  ]);

  const total = result?.meta?.[0]?.total ?? 0;
  const totalPages = take > 0 ? Math.ceil(total / take) : 0;

  res.status(200).json({
    data: result?.data ?? [],
    pagination: {
      page,
      limit: take,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1 && total > 0,
    },
  });
}

/** GET /api/requests/:id */
export async function getRequest(req, res) {
  const request = await Request.findById(req.params.id)
    .populate('assignee', USER_PUBLIC_SELECT)
    .populate('createdBy', USER_PUBLIC_SELECT)
    .lean();
  if (!request) throw notFound('Request');
  res.status(200).json({ data: toPublicRequest(request) });
}

/** POST /api/requests — any authenticated user. */
export async function createRequest(req, res) {
  const body = req.body;

  if (body.assignee && !(await assigneeExists(body.assignee))) {
    throw badRequest('Assignee does not exist.', [
      { path: 'assignee', message: 'No user with that id' },
    ]);
  }

  const request = await Request.create({
    customerName: body.customerName,
    phone: body.phone,
    phoneNormalized: normalizePhone(body.phone),
    service: body.service,
    priority: body.priority,
    assignee: body.assignee ?? null,
    notes: body.notes ?? [],
    attachmentUrl: body.attachmentUrl ?? null,
    createdBy: req.user._id,
  });

  const populated = await request.populate([
    { path: 'assignee', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ]);

  res.status(201).json({ data: toPublicRequest(populated) });
}

/** PATCH /api/requests/:id — owner only (enforced by requireRole in the router). */
export async function updateRequest(req, res) {
  const body = { ...req.body };

  if (body.assignee && !(await assigneeExists(body.assignee))) {
    throw badRequest('Assignee does not exist.', [
      { path: 'assignee', message: 'No user with that id' },
    ]);
  }
  if (body.phone) body.phoneNormalized = normalizePhone(body.phone);

  // Status is intentionally not in the whitelist: transitions must go through
  // transitionStatus() so an audit event is always written.
  const request = await Request.findByIdAndUpdate(
    req.params.id,
    { $set: body },
    { new: true, runValidators: true }
  )
    .populate('assignee', USER_PUBLIC_SELECT)
    .populate('createdBy', USER_PUBLIC_SELECT);

  if (!request) throw notFound('Request');
  res.status(200).json({ data: toPublicRequest(request) });
}

/**
 * PATCH /api/requests/:id/status — owner or staff.
 *
 * The business rule: open -> in-progress -> done -> billed, one step at a time.
 * Every accepted move writes a RequestEvent in the same operation. If the event
 * write fails, the status change is rolled back, so the request document and
 * the audit trail can never disagree.
 */
export async function transitionStatus(req, res) {
  const { toStatus, note } = req.body;
  const request = await Request.findById(req.params.id);
  if (!request) throw notFound('Request');

  const fromStatus = request.status;

  if (fromStatus === toStatus) {
    throw invalidTransition(`Request is already in status "${toStatus}".`, [
      { path: 'toStatus', message: 'No-op transitions are not allowed' },
    ]);
  }
  if (!isAllowedTransition(fromStatus, toStatus)) {
    throw invalidTransition(
      `Cannot move a request from "${fromStatus}" to "${toStatus}". ` +
        `Allowed next status for "${fromStatus}" is "${nextStatusFor(fromStatus)}".`,
      [{ path: 'toStatus', message: `Illegal transition ${fromStatus} -> ${toStatus}` }]
    );
  }

  request.status = toStatus;
  await request.save();

  try {
    await recordRequestEvent({ request, actor: req.user, fromStatus, toStatus, note });
  } catch (err) {
    // Compensating write. A real deployment on a replica set would wrap both
    // writes in a transaction (this backend is single-node, so there is no
    // transaction support here); the effect is the same: no status change
    // survives without its audit event.
    await Request.findByIdAndUpdate(request._id, { $set: { status: fromStatus } });
    throw internalError('Status update failed and was rolled back.');
  }

  const populated = await request.populate([
    { path: 'assignee', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ]);

  res.status(200).json({ data: toPublicRequest(populated) });
}

/** DELETE /api/requests/:id — owner only. Audit events are deleted with it (cascade). */
export async function deleteRequest(req, res) {
  const request = await Request.findByIdAndDelete(req.params.id);
  if (!request) throw notFound('Request');
  res.status(200).json({ data: { id: request.id, deleted: true } });
}

/** GET /api/requests/:id/events — the audit trail, oldest first. */
export async function getRequestEvents(req, res) {
  const exists = await Request.exists({ _id: req.params.id });
  if (!exists) throw notFound('Request');

  const events = await listRequestEvents(req.params.id);
  // listRequestEvents uses .lean(), which bypasses the schema's toJSON
  // transform, so _id would leak here. Same normalisation as requests.
  const data = events.map((event) => {
    const { _id, __v, actor, ...rest } = event;
    return { id: _id !== undefined ? String(_id) : rest.id, ...rest, actor: toPublicUserRef(actor) };
  });
  res.status(200).json({ data, count: data.length });
}

/** Assignee must be a real user, not just a well-formed id. */
async function assigneeExists(id) {
  if (!mongoose.isValidObjectId(id)) return false;
  return Boolean(await User.exists({ _id: id }));
}

/** Single source of truth for the chain lives in the model, not here. */
function nextStatusFor(fromStatus) {
  return ALLOWED_TRANSITIONS[fromStatus] ?? 'none';
}
