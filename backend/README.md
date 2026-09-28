# SevaDesk — Backend API

> Backend only. The React frontend is a separate repository/project; this README
> deliberately documents the API in isolation.

A small, production-shaped **MERN REST API** for a dental clinic's front-desk
job book: receptionists log in, log customer jobs (root canal, cleaning,
ortho consult), move each job through a fixed workflow, and every status change
is recorded in an append-only audit trail.

Built as a portfolio project to demonstrate the things that actually get asked
about in a junior full-stack interview: layered Express architecture, a single
error contract, zod validation at the boundary, role-based access control, and
a database invariant that is enforced by the schema rather than by discipline.

- **Runtime** Node.js ≥ 20 (tested on 24.18), ESM (`"type": "module"`)
- **Stack** Express 4 · Mongoose 8 · MongoDB · zod · jsonwebtoken · bcryptjs
- **Tests** Vitest + Supertest + `mongodb-memory-server` — 51 tests, no external DB required

---

## Quick start

Three commands, from a clean checkout with MongoDB running locally:

```bash
npm install
cp .env.example .env && npm run seed     # demo data + index creation
npm run dev                              # http://localhost:5000
```

Verify it is alive:

```bash
curl http://localhost:5000/health
```

Run the test suite (no MongoDB needed — it boots an in-memory server):

```bash
npm test
```

### Demo credentials (created by `npm run seed`)

| Email | Password | Role |
|---|---|---|
| `owner@demo.com` | `Staff@123` | `owner` |
| `staff@demo.com` | `Staff@123` | `staff` |

The seed writes 20 requests for a fictional clinic ("Dr. Sharma Dental,
Haldwani") spread evenly across all four statuses and all three priorities,
with a matching `RequestEvent` history for each.

---

## API

All routes are prefixed `/api`. Auth is a **JWT in an httpOnly cookie** — there
is no token in any response body, in `localStorage`, or in a header.

| Method | Path | Auth | Body / Query | Success |
|---|---|---|---|---|
| `GET` | `/health` | none | — | `200` `{status, uptime, db, timestamp}` |
| `POST` | `/api/auth/register` | none | `{email, password, name, role?}` | `201` `{data: user}` |
| `POST` | `/api/auth/login` | none | `{email, password}` | `200` `{data: user}` |
| `POST` | `/api/auth/logout` | none | — | `200` `{data:{success:true}}` |
| `GET` | `/api/auth/me` | any | — | `200` `{data: user}` |
| `GET` | `/api/requests` | any | `?page&limit&status&priority&q&sort` | `200` `{data, pagination}` |
| `POST` | `/api/requests` | any | `{customerName, phone, service, priority?, assignee?, notes?, attachmentUrl?}` | `201` `{data: request}` |
| `GET` | `/api/requests/:id` | any | — | `200` `{data: request}` |
| `GET` | `/api/requests/:id/events` | any | — | `200` `{data: events, count}` |
| `PATCH` | `/api/requests/:id` | **owner** | any subset of the create fields | `200` `{data: request}` |
| `PATCH` | `/api/requests/:id/status` | owner or staff | `{toStatus, note?}` | `200` `{data: request}` |
| `DELETE` | `/api/requests/:id` | **owner** | — | `200` `{data:{id, deleted:true}}` |

### Why the RBAC split looks like this

Staff do the work that moves a job forward, so they get the status transition.
Owners alone get field edits and deletes, because those are the two operations
that rewrite history or destroy data. Front-desk staff editing a customer's
phone number in bulk is exactly the failure mode worth blocking.

### Status transitions

Strictly one step forward, no skips, no going backwards, no no-ops:

```
open ──▶ in-progress ──▶ done ──▶ billed
```

Anything else is `400 invalid_transition`, and the error names the legal next
status so a client can render a useful message. Every accepted transition
writes a `RequestEvent` (`fromStatus`, `toStatus`, `actor`, `at`, optional
`note`); if that write fails the status change is rolled back, so the request
and its audit trail can never disagree.

### List endpoint

```
GET /api/requests?page=1&limit=20&status=open&priority=high&q=98765&sort=-createdAt
```

```json
{
  "data": [ { "id": "…", "customerName": "…", "assignee": { "id": "…", "name": "…", "email": "…" }, "…": "…" } ],
  "pagination": { "page": 1, "limit": 20, "total": 137, "totalPages": 7, "hasNext": true, "hasPrev": false }
}
```

- `page` ≥ 1 (default 1), `limit` 1–100 (default 20, **`limit=500` is rejected
  with `400 invalid_input`** rather than silently clamped)
- `q` searches a real MongoDB **text index** on `customerName` +
  `phoneNormalized`; an all-digit `q` is instead run as a prefix regex against
  `phoneNormalized`, because a text index tokenises numbers into whole words
  and cannot prefix-match a phone number
- `sort` is `createdAt` (asc) or `-createdAt` (desc, default)
- One `$facet` aggregation produces the page and the total in a single round
  trip, and `assignee`/`createdBy` are `$lookup`ed with a **projection**, so a
  password hash cannot leak into a list response even by accident

### Error contract

Every error, thrown or expected, has the same shape:

```json
{ "error": { "code": "invalid_input", "message": "human readable", "details": [ { "path": "email", "message": "…" } ] } }
```

| Code | HTTP | Raised when |
|---|---|---|
| `invalid_input` | 400 | zod / mongoose validation, malformed ObjectId, bad body |
| `invalid_transition` | 400 | illegal status move, or a no-op |
| `unauthorized` | 401 | missing, invalid or expired session cookie |
| `forbidden` | 403 | authenticated but the wrong role |
| `not_found` | 404 | no such route or resource |
| `conflict` | 409 | duplicate key (e.g. email already registered) |
| `rate_limited` | 429 | too many requests |
| `internal_error` | 500 | anything unhandled; stack included **only** outside production |

`src/middleware/errorHandler.js` is the only place that decides this, and it is
registered last. zod → `invalid_input` with `details`; mongoose
`ValidationError` → `invalid_input`; `CastError` → `invalid_input`; duplicate
key `11000` → `conflict`.

---

## Data model

**User** — `email` (lowercased, unique, indexed), `passwordHash`, `name`,
`role: 'owner' | 'staff'`, timestamps.
There is no `password` field on the document. A write-only virtual `password`
setter feeds a `pre('validate')` hook that bcrypts at 12 rounds. The hook is on
`validate`, not `save`, because mongoose runs its own required-field validation
as an internal `pre('save')` hook that is registered at schema-creation time —
a user hook on `save` runs *after* validation and would always lose the race
with `passwordHash is required`.

**Request** — `customerName`, `phone` (normalised to digits), `service`,
`status`, `priority`, `assignee → User`, `notes: [String]`, `attachmentUrl`,
`createdBy → User`, timestamps.
Indexes: compound `{ status: 1, createdAt: -1 }` (the list query) and text
`{ customerName: 'text', phoneNormalized: 'text' }` (search). `phone` is
normalised on write, so `+91 98765-43210` and `9876543210` are the same key and
one text index serves both fields.

**RequestEvent** — `request → Request`, `actor → User`, `fromStatus`,
`toStatus`, `note`, `at`. Append-only.
The schema registers `pre` hooks on `updateOne`, `updateMany`, `replaceOne`,
`findOneAndUpdate`, `findOneAndReplace`, `deleteOne`, `deleteMany` and
`findOneAndDelete` that **throw**. There are no routes that mutate it, and the
model refuses to be mutated anyway, so the invariant does not depend on
remembering a rule. `Request` deliberately has **no** `statusHistory` array:
two copies of the same state drift the moment one write fails.

---

## Environment variables

See `.env.example` for annotated values.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `5000` | HTTP port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/sevadesk` | Connection string |
| `JWT_SECRET` | dev fallback | **Required in production, ≥ 32 chars — the process refuses to boot otherwise** |
| `JWT_EXPIRES_IN` | `7d` | Session lifetime (`s`/`m`/`h`/`d` suffix) |
| `BCRYPT_SALT_ROUNDS` | `12` | bcrypt work factor |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS allow-list |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Shared limiter window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Default request ceiling |
| `AUTH_RATE_LIMIT_MAX` | `10` | Login attempts (failures only) |
| `REQUEST_CREATE_RATE_LIMIT_MAX` | `60` | Job creations |
| `ALLOW_PROD_SEED` | `false` | Must be `true` to seed while `NODE_ENV=production` |

---

## Architecture

```
src/
  app.js            express assembly — no listen(), so tests can import it
  server.js         entrypoint: connect DB, listen, graceful shutdown
  config/           env (zod-validated) and mongoose connection
  routes/           path + middleware wiring only
  controllers/      request/response handling
  services/         audit trail writes
  models/           mongoose schemas, indexes, invariants
  validators/       zod schemas
  middleware/       auth, validation, 404, central error handler
  utils/            ApiError, JWT helpers, asyncHandler
tests/              vitest suites + in-memory Mongo setup
```

`app.js` and `server.js` are split so that a test can drive the full HTTP
pipeline through Supertest without opening a port. Route handlers are wrapped
in `asyncHandler` because Express 4 does not catch rejected promises.

---

## Tests

```bash
npm test          # 51 tests, ~40s
npm run test:watch
```

`mongodb-memory-server` boots a real in-memory mongod per run, so there is no
mocked database layer — the tests exercise actual indexes, actual text search
and actual document validation. Covered: httpOnly cookie issuance, no password
in any response, 401 on a missing/tampered/expired cookie, timing-equalised
login failures, owner/staff RBAC on every write route, the full legal
transition chain, skip/backwards/no-op rejection, audit rollback when the event
write fails, `RequestEvent` immutability, pagination metadata, compound-index
filtering, text search, phone prefix search, sort direction, `limit=500`
rejection, and zod `details` payloads.

---

## What was cut, and why

Deliberately absent, to keep the dependency surface defensible:

| Cut | Why |
|---|---|
| Redis / rate-limit store | In-memory is correct for a single instance; a shared store is a scaling question, not a design question. |
| TypeScript | The brief is a JS/Node role; `zod` already gives runtime type safety at the boundary. |
| Docker | The host deploys directly on Node 20 LTS. |
| Passport | One strategy (cookie JWT) does not need a framework. |
| WebSockets / Socket.IO | No live-collaboration requirement. |
| Email / nodemailer | No notification requirement yet. |
| Object storage | `attachmentUrl` is a URL, not an upload endpoint. |
| Soft deletes | `RequestEvent` gives the history; `createdBy` + `at` give the rest. |
| `tsup`/bundler, Swagger, structured logging | YAGNI at this size. |

---

## What broke, and what is next

Things that actually bit during the build, kept here because they are the
interesting part:

1. **The bcrypt hook never ran.** Mongoose registers its own required-field
   validation as an internal `pre('save')` hook, so a user hook on `save` runs
   *after* validation and the document was always rejected for a missing
   `passwordHash`. Moved to `pre('validate')`.
2. **Aggregation results have no `id`.** `$facet` returns plain objects that
   bypass the schema `toJSON` transform, and `.lean()` does the same, so list
   and get-one responses exposed `_id` while create exposed `id`. Normalised
   with a shared `toPublicRequest` helper plus an `$addFields`/`$project` stage.
3. **Order-dependent tests.** Three list tests were seeded by a *different*
   test, and `afterEach` wipes the database — so they only passed in file
   order. Each test now seeds its own fixtures.
4. **`forEach` over an array length is a no-op modulo.** The seed used
   `PRIORITIES[(i * 3) % 3]`, which made every seeded request `low`. Caught
   only by reading the seed's own summary table.
5. **`zod` v4 removed `error.errors`** in favour of `error.issues`. Anything
   written against v3 tutorials silently produces empty `details`.

Known follow-ups, in priority order:

- **Cross-site cookies.** `sameSite: 'lax'` is right while the frontend and API
  share a site. The moment the frontend is on a different domain this needs
  `sameSite: 'none'` + `secure: true` (already wired in `utils/tokens.js`) and
  an HTTPS deployment. This is a known, deliberate deferral, not an oversight.
- **Phone search needs the country code.** The numeric `q` branch is
  prefix-anchored, so a receptionist typing a 10-digit number finds nothing
  when the record is stored as `919876543210`. Dropping the `^` anchor fixes it
  and is a one-line change.
- **Transactions for the audit write.** The status change plus its
  `RequestEvent` are written with a compensating rollback, because a real
  MongoDB transaction needs a replica set, which neither the in-memory test
  server nor a standalone local `mongod` provides. The production cluster is a
  replica set, so this should become a real transaction.
- **Rate limiting is per-process.** Behind multiple instances each keeps its
  own counters. Move to a shared store when horizontal scaling starts.
- **Rate limiting keys on IP.** A clinic behind one NAT has one shared login
  budget. Key on `email` as well once real usage data shows it matters.
- **Index creation in production.** `autoIndex` is off outside development, so
  `npm run seed` (or an explicit `syncIndexes()` on boot) is what guarantees the
  compound and text indexes exist.
