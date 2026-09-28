import mongoose from 'mongoose';

export const REQUEST_STATUSES = Object.freeze(['open', 'in-progress', 'done', 'billed']);
export const REQUEST_PRIORITIES = Object.freeze(['low', 'normal', 'high']);

/**
 * The single most important business rule in the product, expressed as data so
 * it can be unit-tested and reasoned about without touching a database.
 *
 * Allowed:   open -> in-progress -> done -> billed
 * Rejected:  every skip (open -> done), every backwards move, every no-op.
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  open: 'in-progress',
  'in-progress': 'done',
  done: 'billed',
});

/** @returns {boolean} true only for the one legal next status. */
export function isAllowedTransition(fromStatus, toStatus) {
  return ALLOWED_TRANSITIONS[fromStatus] === toStatus;
}

/** Strip spaces, dashes, brackets and a leading `+` — leaves digits only. */
export function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

const requestSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'customerName is required'],
      trim: true,
      minlength: [2, 'customerName must be at least 2 characters'],
      maxlength: [120, 'customerName must be at most 120 characters'],
    },
    /**
     * Stored canonical: digits only, set by the setter below. A user may type
     * "+91 98765-43210"; what lands in Mongo is "919876543210". One canonical
     * form means dedupe and search never have to deal with punctuation variants.
     */
    phone: {
      type: String,
      required: [true, 'phone is required'],
      trim: true,
      set: (v) => normalizePhone(v),
      validate: {
        validator: (v) => /^\d{7,15}$/.test(v),
        message: 'phone must contain between 7 and 15 digits after normalization',
      },
    },
    /**
     * A dedicated, immutable, index-facing copy of the same digits. It exists so
     * the text index has a stable, punctuation-free field to point at and so
     * the list filter can anchor a prefix regex on it later without touching the
     * user-facing `phone` value. Written in a pre-validate hook so it is correct
     * no matter which code path creates the document.
     */
    phoneNormalized: {
      type: String,
      index: true,
      default: '',
    },
    service: {
      type: String,
      required: [true, 'service is required'],
      trim: true,
      minlength: [2, 'service must be at least 2 characters'],
      maxlength: [160, 'service must be at most 160 characters'],
    },
    status: {
      type: String,
      enum: { values: REQUEST_STATUSES, message: 'status must be one of: open, in-progress, done, billed' },
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: { values: REQUEST_PRIORITIES, message: 'priority must be one of: low, normal, high' },
      default: 'normal',
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (v) => v.length <= 20,
          message: 'a request can have at most 20 notes',
        },
      ],
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: null,
      maxlength: 2048,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
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

// Keeps `phoneNormalized` in lock-step with `phone` on every write path.
requestSchema.pre('validate', function syncPhoneNormalized(next) {
  if (this.phone) this.phoneNormalized = normalizePhone(this.phone);
  next();
});

/**
 * Serves the default list view: "openest/most recent first, optionally
 * filtered by status". Without this, the paginated list is a collection scan
 * plus an in-memory sort — the first thing that falls over under real data.
 */
requestSchema.index({ status: 1, createdAt: -1 });

/**
 * Backs `?q=`. A text index gives relevance-ranked, stemmed matching over
 * customerName and phoneNormalized.
 *
 * IMPORTANT: production MongoDB sets `autoIndex: false` (creating a text index
 * on a large collection is a foreground-blocking operation), so this index is
 * built explicitly by `npm run seed` -> `syncIndexes()`. See src/scripts/seed.js.
 */
requestSchema.index({ customerName: 'text', phoneNormalized: 'text' });

/**
 * NOTE: there is deliberately no `statusHistory` array on this model.
 * Duplicating status state here would mean two sources of truth that can drift;
 * `RequestEvent` is the append-only audit trail and the only place history
 * lives. Aggregating it is a `$lookup` away when a view needs it.
 */

export const Request = mongoose.models.Request ?? mongoose.model('Request', requestSchema);
