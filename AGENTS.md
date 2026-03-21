# Thailand Panties — project context (AI / contributor)

This file is the **canonical place** to reload project context between sessions. Update it when deployment or layout changes.

**Cursor:** `.cursor/rules/project-context.mdc` always applies so the agent reads this doc each session.

## Production repos (the only two that matter)

| Folder | Remote | Role |
|--------|--------|------|
| `Desktop/frontend/` | **`github.com/kyleroofaff/frontend`** | React + Vite SPA. `npm run build` → `dist/`. Served by nginx. |
| `Desktop/backend/` | **`github.com/kyleroofaff/backend`** | Express API on :4000. Postgres, auth, push, email, etc. |

### Ignore for production

| Folder | Remote | Note |
|--------|--------|------|
| `Desktop/tp/` | `github.com/kyleroofaff/thp` | **Test/sandbox only.** Do not deploy from here. Do not sync to here. |

## Architecture

- **Frontend** (`frontend/`): Vite + React. Dev server :5173; `vite.config.js` proxies `/api` → `http://localhost:4000`.
- **Backend** (`backend/`): Express on :4000. Postgres (`pg`), JWT auth, push (`web-push`), email (`nodemailer`), attachment scanning.
- **Production domains:** `thailandpanties.com` (frontend), `api.thailandpanties.com` (backend API).
- **Frontend → API:** `VITE_API_BASE_URL` baked at Vite build time. Code falls back to `https://api.thailandpanties.com` when host is `thailandpanties.com`.

## Dockerfiles (both repos have one)

### Frontend (`frontend/Dockerfile`)
- Multi-stage: node build → nginx runtime.
- **Must pass `--build-arg VITE_API_BASE_URL=https://api.thailandpanties.com`** for production builds.
- Serves on port **80** (nginx).

### Backend (`backend/Dockerfile`)
- Single stage: node:20-alpine, `npm ci --omit=dev`, `npm start`.
- Serves on port **4000**.
- Needs env vars at **runtime** (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, etc.).

## Deploy (DigitalOcean Droplet + Docker)

### On the Droplet

```
/opt/thailandpanties/
  frontend/          ← clone of kyleroofaff/frontend
  backend/           ← clone of kyleroofaff/backend
  docker-compose.yml ← orchestrates both + postgres
```

### Redeploy after push

```bash
cd /opt/thailandpanties
git -C frontend pull origin main
git -C backend pull origin main
docker compose up -d --build
```

### Required backend env vars (names only — set values in .env on server, never commit)

`DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SMTP_*`, `EMAIL_MODE`, `ADMIN_EMAIL`, `TRUST_PROXY`, `INBOUND_WEBHOOK_TOKEN`, `ATTACHMENT_SCAN_*`

See `backend/.env.example` for full list.

## Windows / PowerShell

If `npm` fails with *"npm.ps1 cannot be loaded because running scripts is disabled"*:

`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## Key files

- `src/site.jsx` — main app shell, routing, API client.
- `src/pages/DashboardPages.jsx` — dashboard surfaces.
- `vite.config.js` — dev proxy, build stamp plugin.
- `nginx.conf` — SPA cache rules (no-cache HTML, immutable /assets/).
- `Dockerfile` — multi-stage frontend build.

## Troubleshooting: site not updating after push

1. **Did you rebuild on the Droplet?** `git push` only updates GitHub. SSH in and run the redeploy commands above.
2. **Stale HTML:** nginx must not cache `index.html`. Check `nginx.conf` has `no-store` for `/`.
3. **Verify:** View page source → look for `<!-- build:... -->` and `<meta name="app-build" ...>`.
4. **CORS:** Backend `CLIENT_ORIGIN` must include `https://thailandpanties.com`.

---

*Last updated: clarified frontend + backend are production; tp/thp is test-only.*
