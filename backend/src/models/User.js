import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const USER_ROLES = Object.freeze(['owner', 'staff']);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      minlength: [2, 'name must be at least 2 characters'],
      maxlength: [80, 'name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      // Lowercase + trim on the way in so `A@X.com` and `a@x.com` can never
      // become two accounts. Combined with the unique index this is what makes
      // registration idempotent-safe.
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email must be a valid email address'],
    },
    /**
     * The ONLY persisted form of the password. There is no `password` path in
     * this schema — a plaintext password cannot be saved even by accident.
     * `select: false` is belt-and-braces: a stray `User.findOne()` never
     * hydrates the hash into memory unless the caller explicitly asks with
     * `.select('+passwordHash')` (only `auth.controller.js` login does).
     */
    passwordHash: {
      type: String,
      required: [true, 'passwordHash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: 'role must be one of: owner, staff',
      },
      default: 'staff',
      index: true,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        // Defence in depth: even if a caller adds a field later, strip anything
        // that smells like a credential before it reaches the wire.
        delete ret.passwordHash;
        // Rename before deleting: reading ret._id after `delete` would always
        // be undefined and the id would silently vanish from the response.
        ret.id = String(ret._id ?? ret.id);
        delete ret._id;
        return ret;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

/**
 * Write-only virtual. Assigning `user.password = 'x'` stashes the plaintext on a
 * non-persisted JS property; the pre-save hook below is the only thing that
 * ever turns it into a hash.
 */
userSchema
  .virtual('password')
  .set(function setPassword(plain) {
    this._plainPassword = plain;
  })
  .get(function getPassword() {
    return undefined; // never readable, even in-process
  });

/**
 * Hash on `pre('validate')`, not `pre('save')`.
 *
 * Mongoose registers its own validation as an internal `pre('save')` hook at
 * schema-creation time, which means user-registered `pre('save')` hooks run
 * AFTER `required` checks. Hashing in `pre('save')` therefore fails with
 * "passwordHash is required" on every new document. `pre('validate')` runs
 * first, so the hash exists by the time validation inspects the doc.
 *
 * A document with no plaintext and no hash change is left alone, so ordinary
 * `required` validation still reports the useful "passwordHash is required"
 * message for a caller that forgot to set a password at all.
 */
userSchema.pre('validate', async function hashPassword() {
  if (!this._plainPassword) {
    // No plaintext: either nothing to do, or someone tried to overwrite the
    // hash directly. The latter is rejected rather than silently accepted.
    if (this.isModified('passwordHash')) {
      this.invalidate('passwordHash', 'passwordHash cannot be changed directly');
    }
    return;
  }

  this.passwordHash = await bcrypt.hash(this._plainPassword, env.BCRYPT_SALT_ROUNDS);
  // Drop the plaintext the instant it has been hashed, so it cannot be
  // serialised or accidentally carried on the in-memory document.
  this._plainPassword = undefined;
});

/** Verify a plaintext candidate against the stored hash. */
userSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
