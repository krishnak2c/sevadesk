# SevaDesk — Frontend

React 19 + Vite SPA for the SevaDesk service-request dashboard. Consumes the [SevaDesk backend API](../backend/README.md) over `http://localhost:5000`.

## Stack

- React 19, React Router 7 (declarative route guards)
- Vite 8, plain CSS (no UI framework)
- One hand-rolled `request()` helper in `src/api/client.js` — `credentials: 'include'` cookie sessions, typed `ApiError` with `{ error: { code, message, details } }` support
- Inline SVG icons, native `<dialog>` for confirmations (focus trap + Escape for free)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

The dev server proxies nothing — the API base URL comes from `VITE_API_URL` (default `http://localhost:5000`, see `.env.example`). The backend must be running and CORS-configured with `ALLOWED_ORIGINS=http://localhost:5173` for the session cookie to work.

## Structure

```
src/
├── api/            # client.js + auth/requests/health modules
├── auth/           # AuthContext (loading|authenticated|anonymous), guards, login/signup forms
├── components/     # AppShell, Sidebar, TopBar, ConfirmDialog, badges, pagination, skeleton…
├── features/
│   └── requests/   # table, filters, form, detail, status timeline + workflow controls
├── pages/          # RequestsPage, RequestDetailPage, NewRequestPage, EditRequestPage
└── main.jsx        # entry, Router, AuthProvider
```

## Notable behaviours

- The route guard renders a splash screen while the session probe (`GET /api/auth/me`) is in flight — never a login flash.
- The status workflow surfaces **only the legal next transition** for the current status; the API is the source of truth and rejects illegal moves.
- The requests table degrades to self-labelled cards under 700px (no column-labels, no horizontal scroll).