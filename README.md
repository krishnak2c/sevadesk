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