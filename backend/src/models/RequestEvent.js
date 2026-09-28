import mongoose from 'mongoose';
import { REQUEST_STATUSES } from './Request.js';

/**
 * Append-only audit trail. One row per status transition, written in the same
 * operation as the transition itself (see `controllers/request.controller.js`
 * and `services/audit.js`).
 *
 * Design rule: this collection is write-once. There is no route that updates or
 * deletes an event, and the pre-hooks below make that true at the model layer
 * too — so even a careless internal script or a future "convenience" edit in
 * the REPL cannot rewrite history. The immutability is enforced in the database
 * driver, not just by convention.
 */
const requestEventSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromStatus: {
      type: String,
      enum: { values: REQUEST_STATUSES, message: 'fromStatus must be a valid status' },
      required: true,
    },
    toStatus: {
      type: String,
      enum: { values: REQUEST_STATUSES, message: 'toStatus must be a valid status' },
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    at: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false, // `at` is the timestamp; updatedAt on an immutable row is noise
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

// Timeline reads are always per-request, newest last.
requestEventSchema.index({ request: 1, at: -1 });

const IMMUTABLE_OPERATION_MESSAGE =
  'RequestEvent is append-only: update and delete operations are not allowed.';

/**
 * Pre-hooks cannot *prevent* an update (mongoose 8 has no `immutable` for
 * arbitrary operations), but they can veto it before a write is issued, and
 * `findOneAndUpdate` / `findOneAndDelete` are the only two that would otherwise
 * succeed silently. Blocking `updateOne` / `deleteOne` too means a bad service
 * layer fails loudly instead of quietly corrupting the audit trail.
 */
for (const op of [
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
]) {
  requestEventSchema.pre(op, function blockMutation() {
    throw new Error(`${IMMUTABLE_OPERATION_MESSAGE} (blocked: ${op})`);
  });
}

export const RequestEvent = mongoose.models.RequestEvent ?? mongoose.model('RequestEvent', requestEventSchema);
