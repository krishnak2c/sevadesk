# SevaDesk

A service-request dashboard for a single-location clinic. Staff log patient service requests; the owner moves each one through a controlled workflow — **open → in progress → done → billed** — and every transition is written to an append-only audit trail.

Built as a portfolio project to demonstrate a complete, production-shaped full-stack system: real authentication, role-based access control, an audited state machine, search and pagination, and a responsive UI.

## Demo

- **API:** [Swagger-style route reference → `backend/README.md`](backend/README.md)
- **Frontend:** [structure and run instructions → `frontend/README.md`](frontend/README.md)

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js (ESM), Express 4, MongoDB + Mongoose 8 |
| Auth | httpOnly-cookie sessions (JWT), bcrypt password hashing |
| Frontend | React 19, React Router 7, Vite |
| Tests | Vitest + Supertest + mongodb-memory-server (51 integration tests) |

## Run locally

```bash
# 1. Backend (defaults to a local MongoDB on 127.0.0.1:27017)
cd backend
cp .env.example .env      # adjust MONGODB_URI / JWT_SECRET
npm install
npm run seed              # demo users + 20 sample requests
npm run dev               # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Demo accounts (created by the seed):

| Role | Email | Password |
|---|---|---|
| Owner | `owner@demo.com` | `Staff@123` |
| Staff | `staff@demo.com` | `Staff@123` |

## Deploy

The API and frontend are hosted separately: the backend as a Render web service (MongoDB on Atlas), the frontend as a static build.

**1. MongoDB Atlas (once, ~5 min)**
- Create a free **M0** cluster (any region).
- Database Access → add a user; Network Access → allow `0.0.0.0/0`.
- Get the connection string, replace `<db_password>`, and append the database name: `...mongodb.net/sevadesk?retryWrites=true&w=majority`.

**2. API on Render (one-click)**
- Push this repo to GitHub, then Render dashboard → **New → Blueprint** → paste the repo URL. `render.yaml` creates the `sevadesk-api` service.
- At creation it prompts for `MONGODB_URI` (from step 1), `JWT_SECRET` (`openssl rand -hex 32`), and `ALLOWED_ORIGINS`. Leave `ALLOWED_ORIGINS` empty for now; it's set once the frontend URL exists.
- `NODE_ENV=production` fails fast if `JWT_SECRET` is missing or under 32 characters, and refuses to seed unless `ALLOW_PROD_SEED=true` is set explicitly.

**3. Frontend on Vercel**
- `npm run build` with `VITE_API_URL=https://<your-api>.onrender.com` baked in (see `frontend/README.md`), then deploy the `dist/` output.

**4. Wire together**
- Back on Render, set `ALLOWED_ORIGINS` to the deployed frontend origin (e.g. `https://sevadesk.vercel.app`) and save — the service redeploys.
- Seed the production database once: `MONGODB_URI=... ALLOW_PROD_SEED=true npm run seed` from `backend/`, then never again. The seed only creates the two demo users and 20 sample requests; it is idempotent and refuses to run in production without the flag.

## What it demos

- **Authn + Authz** — JWT in an httpOnly cookie, owner/staff RBAC enforced server-side (field edits and deletes are owner-only).
- **Audited state machine** — status can only move one legal step at a time; skips, reversals and no-ops are rejected by the API; every successful change writes an immutable `RequestEvent` with actor, note and timestamp.
- **Write hygiene** — Zod validation, centralized error envelope `{ error: { code, message, details } }`, rate limiting, graceful shutdown.
- **Data UX** — text + phone-prefix search, status/priority filters, pagination, normalized phone numbers, responsive table that becomes self-labelled cards on mobile.
- **Testing** — 51 passing integration tests against a real (in-memory) MongoDB covering auth, RBAC, transition legality, the audit trail, rollback-on-audit-failure, and pagination.

## Repository layout

```
sevadesk/
├── backend/    # Express + Mongoose API, seed script, 51 tests
└── frontend/   # React + Vite SPA
```