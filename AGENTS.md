# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Hospital Queue Management System (HOSQ) — a React 18 + TypeScript + Vite 5 + Tailwind CSS frontend backed entirely by a **cloud Supabase** project (PostgreSQL, Auth, Realtime, Edge Functions). No custom backend server.

### Running the app

```bash
npm run dev   # Vite dev server on http://localhost:5173
```

The `.env.local` file must contain `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` pointing at the cloud Supabase project `xealdrmirciqcnnkwmag`. This file is already present in the workspace.

### Available npm scripts

See `package.json` for the full list. Key scripts:

| Script | Command | Notes |
|--------|---------|-------|
| `dev` | `vite` | Dev server at localhost:5173 |
| `build` | `vite build` | Production build to `dist/` |
| `lint` | `eslint .` | ESLint (flat config) |
| `typecheck` | `tsc --noEmit -p tsconfig.app.json` | TypeScript check |
| `preview` | `vite preview` | Preview production build |

### Pre-existing lint/typecheck issues

The codebase has pre-existing ESLint errors (mostly `@typescript-eslint/no-explicit-any` and unused variables) and TypeScript errors (missing generated Supabase types cause `never` type mismatches). These do **not** block `vite build` or `npm run dev`.

### Supabase

- The entire backend runs on a **cloud Supabase** project (project ref `xealdrmirciqcnnkwmag`, region `eu-west-1`).
- Database schema and seed data (queue stages, emergency flags) are already applied.
- Edge Functions (`send-sms`, `auto-emergency-triage`, `sms-health`, `keep-alive`) are deployed to the cloud project.
- SMS notifications require BulkSMS.com API tokens set as Supabase Edge Function secrets — optional for dev.
- The `VITE_SUPABASE_SERVICE_ROLE_KEY` env var is needed only for admin operations (creating staff accounts). Patient-facing features work with just the anon key.

### Testing notes

- No automated test suite exists in this repo. Validation is manual (patient check-in, queue tracking, staff dashboard).
- The patient check-in flow (fill form -> submit -> get queue number -> track queue) is the core "hello world" action and does not require authentication.
- Staff login requires a Supabase Auth account with a matching `user_roles` row.
