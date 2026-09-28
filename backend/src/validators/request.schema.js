import { z } from 'zod';
import mongoose from 'mongoose';
import {
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  normalizePhone,
} from '../models/Request.js';

/**
 * Request (job/ticket) schemas.
 *
 * Everything a client sends is parsed here BEFORE it reaches a controller or a
 * model, so controllers can assume types are correct and defaults are applied.
 */

const objectId = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), { message: 'Must be a valid id' });

/**
 * Phone is validated on its normalised form: strip spaces, dashes, brackets
 * and a leading +, then require 7-15 digits. Storing digits only means
 * "98765 43210" and "+91-98765-43210" are the same key, which is what makes
 * the normalised text search on phone actually useful.
 */
const phone = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((v) => normalizePhone(v))
  .refine((v) => /^\d{7,15}$/.test(v), {
    message: 'Phone number must contain 7 to 15 digits after normalization',
  });

const notes = z
  .array(z.string().trim().min(1).max(500))
  .max(20, 'At most 20 notes are allowed')
  .optional();

export const createRequestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters long')
    .max(120, 'Customer name must be at most 120 characters long'),
  phone,
  service: z
    .string()
    .trim()
    .min(2, 'Service must be at least 2 characters long')
    .max(160, 'Service must be at most 160 characters long'),
  priority: z.enum(REQUEST_PRIORITIES).optional().default('normal'),
  assignee: objectId.optional(),
  notes,
  attachmentUrl: z.string().trim().url('Attachment URL must be a valid URL').optional(),
  // Client may not set status directly: the first row is always 'open', and
  // every later change must go through the transition endpoint so an audit
  // event is written.
  status: z.never().optional(),
});

export const updateRequestSchema = z
  .object({
    customerName: createRequestSchema.shape.customerName,
    phone: phone.optional(),
    service: createRequestSchema.shape.service,
    priority: z.enum(REQUEST_PRIORITIES).optional(),
    assignee: objectId.nullable().optional(),
    notes,
    attachmentUrl: z.string().trim().url('Attachment URL must be a valid URL').nullable().optional(),
    status: z.never().optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const transitionSchema = z.object({
  toStatus: z.enum(REQUEST_STATUSES, {
    message: `toStatus must be one of: ${REQUEST_STATUSES.join(', ')}`,
  }),
  note: z.string().trim().min(1).max(500).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'page must be >= 1').default(1),
  // Rejected rather than silently clamped: a client asking for 500 records
  // has a bug, and quietly returning 100 makes that bug invisible. The
  // controller still re-clamps defensively in case this schema is bypassed.
  limit: z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit must be <= 100').default(20),
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['createdAt', '-createdAt']).default('-createdAt'),
});

export const idParamSchema = z.object({ id: objectId });
