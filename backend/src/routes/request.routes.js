import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import {
  createRequest,
  deleteRequest,
  getRequest,
  getRequestEvents,
  listRequests,
  transitionStatus,
  updateRequest,
} from '../controllers/request.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { tooManyRequests } from '../utils/errors.js';
import {
  createRequestSchema,
  idParamSchema,
  listQuerySchema,
  transitionSchema,
  updateRequestSchema,
} from '../validators/request.schema.js';

const router = Router();

// Every route in this file is authenticated. RBAC is per-route below.
router.use(requireAuth);

/** Write ceiling on job creation: 60 per 15 minutes per IP. */
const createLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.REQUEST_CREATE_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      tooManyRequests(
        `Too many requests created. Try again in ${Math.ceil(env.RATE_LIMIT_WINDOW_MS / 60000)} minutes.`
      )
    );
  },
});

// --- Read: any authenticated user (owner or staff) -------------------------
router.get('/', validate(listQuerySchema, 'query'), asyncHandler(listRequests));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(getRequest));
router.get('/:id/events', validate(idParamSchema, 'params'), asyncHandler(getRequestEvents));

// --- Create: any authenticated user ----------------------------------------
router.post(
  '/',
  createLimiter,
  validate(createRequestSchema),
  asyncHandler(createRequest)
);

// --- Status transition: owner or staff -------------------------------------
// Deliberately open to staff: front-desk staff are the ones who actually move
// a job from "open" to "in-progress", and every move is audited anyway.
router.patch(
  '/:id/status',
  requireRole('owner', 'staff'),
  validate(idParamSchema, 'params'),
  validate(transitionSchema),
  asyncHandler(transitionStatus)
);

// --- Destructive / financial: owner only -----------------------------------
router.patch(
  '/:id',
  requireRole('owner'),
  validate(idParamSchema, 'params'),
  validate(updateRequestSchema),
  asyncHandler(updateRequest)
);
router.delete('/:id', requireRole('owner'), validate(idParamSchema, 'params'), asyncHandler(deleteRequest));

export default router;
