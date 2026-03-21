# Thailand Panties — frontend (AI / contributor context)

This file is the **canonical place** to reload project context between sessions. Update it when deployment or layout changes.

**Cursor:** `.cursor/rules/project-context.mdc` is set to **always apply** so the agent is reminded to follow this doc every session.

## Repos / folders on this machine

| Path | Role |
|------|------|
| `Desktop/frontend/` | **This repo** — React + Vite app (`src/site.jsx` is the main shell). Git remote: `github.com/kyleroofaff/frontend`. |
| `Desktop/backend/` | Express API (`npm run dev` → `node --watch src/server.js`), Postgres via `DATABASE_URL`. |
| `Desktop/tp/` | **Fullstack monorepo** (`client/` + `server/`) with the same split; README documents DigitalOcean deploy. May differ slightly from `frontend/` + `backend/` — confirm which copy you deploy from. |

## Architecture (short)

- **Frontend:** Vite + React. Dev server **:5173**; `vite.config.js` proxies **`/api` → `http://localhost:4000`**.
- **Backend:** Express on **:4000** (see `backend/package.json`). Uses **PostgreSQL** (`pg`). Push, auth, bootstrap, state sync, etc.
- **Production domains (from code):** `thailandpanties.com` / `www` → API default **`https://api.thailandpanties.com`** when host matches (`src/site.jsx` `resolveApiBaseUrl`). Override with **`VITE_API_BASE_URL`** at build time.
- **Client env:** See **`.env.example`** (`VITE_API_BASE_URL`, `VITE_APP_BASE_URL`, seed admin for local/demo).

## Deploy (documented in `Desktop/tp/README.md`)

- **Frontend:** Build from `client/` (here: `frontend/`): `npm install && npm run build` → output **`dist/`**. Set **`VITE_API_BASE_URL=https://<api-host>`** for production builds.
- **Backend:** `npm install && npm start`, `PORT`, **`CLIENT_ORIGIN`**, **`JWT_SECRET`**, **`DATABASE_URL`**, etc. (see `server/.env.example` in monorepo).
- **No GitHub Actions** were found under `frontend/`; deploy is **not** automatically implied by `git push` unless configured on the host (e.g. DigitalOcean App Platform).

## Ops scripts (in this repo)

- `scripts/smoke.ps1` — smoke tests
- `scripts/ops-*.sh` — backup/monitor/restore/report (shell; likely run on server/CI)

## What automated assistants **cannot** assume

- SSH/Docker/VPS/DigitalOcean dashboard access, production env vars, or live deploy logs unless pasted or exposed in-repo.
- That `git push` updated production — always verify **last deploy commit / build time** on the hosting provider.

## Key frontend files

- `src/site.jsx` — main app, routing, API client (`API_BASE_URL`), marketplace UI.
- `src/pages/DashboardPages.jsx` — large dashboard surfaces.
- `vite.config.js` — dev proxy to backend.

---

*Last updated: session documenting Desktop layout + tp README + vite/site.jsx.*
