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

### On the Droplet (host: thailandpanties.com)

```
/opt/tp/
  frontend/          ← clone of kyleroofaff/frontend
  backend/           ← clone of kyleroofaff/backend
  deploy/            ← docker-compose.yml + Dockerfiles + env files
  data/postgres/     ← Postgres data volume
  ops/               ← operational scripts
  backups/           ← database backups
```

### SSH access

**Use the hostname, not the raw IP** — the Droplet only accepts key auth via the domain:

```bash
ssh -o ConnectTimeout=15 -i ~/.ssh/id_ed25519_github root@thailandpanties.com
```

PowerShell equivalent (Windows):

```powershell
ssh -o ConnectTimeout=15 -i "$env:USERPROFILE\.ssh\id_ed25519_github" root@thailandpanties.com
```

### Redeploy after push

```bash
cd /opt/tp/frontend && git pull origin main
cd /opt/tp/deploy && docker compose up -d --build frontend
```

For backend changes too:

```bash
cd /opt/tp/backend && git pull origin main
cd /opt/tp/deploy && docker compose up -d --build
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

## Production smoke (API, shipping, tracking, payments)

Use these before relying on live card or wallet flows (all on `https://api.thailandpanties.com`):

1. **`GET /api/health`** and **`GET /api/health/ready`** — expect `200` and JSON `ok: true`. (A bare **`/health`** path often **404**s if only `/api/*` is routed to the app.)
2. **`GET /api/shipping/rates`** — public JSON; confirm `rates_last_updated` and per-zone `rate` values match the deployed `backend/config/shippingRates.json` (and mirrored `SHIPPING_ZONES` in the frontend).
3. **AfterShip** — backend runtime needs **`AFTERSHIP_API_KEY`** (see `backend/.env.example`). Without it, **`POST /api/orders/:orderId/tracking`** cannot register trackings and buyer **Check Status** will not get live checkpoints.
4. **Bankful / wallet top-up** — backend needs **`BANKFUL_*`** (and related) vars from `backend/.env.example` on the **running** backend container.

## Shipping rates

Zone-based flat-rate shipping (THB). See `.cursor/rules/shipping-rates.mdc` for full details.

- **Config**: `backend/config/shippingRates.json` (source of truth) + `SHIPPING_ZONES` in `frontend/src/site.jsx`.
- **Backend validation**: `backend/src/services/shippingService.js` — validates fees at checkout.
- **API**: `GET /api/shipping/rates` (public, no auth).
- **To update rates**: edit the JSON config + mirror in `SHIPPING_ZONES`, bump `rates_last_updated`, push & redeploy both repos.

## Fulfillment workflow (orders + custom requests)

Single state machine for both product orders and accepted custom-request quotes:
`processing → fulfilled → shipped → delivered`.

- **Seller**: `POST /api/orders/:orderId/fulfill` flips `processing → fulfilled` (taken to bar / ready to ship). Buyer gets the `order_ready_to_ship` push.
- **Bar (or solo seller)**: `POST /api/orders/:orderId/tracking` flips `fulfilled → shipped`. Mandatory: non-empty `trackingNumber` + a real carrier slug ("Not set" is rejected). Affiliated orders are bar-only; non-affiliated orders are seller-only. Buyer gets the `order_shipped` push.
- **AfterShip webhook**: `POST /api/aftership/webhook` flips `shipped → delivered` and dispatches `order_delivered`. See **AfterShip webhook** below.
- **Custom requests**: when a quote is accepted, the backend synthesises an `order_cr_<requestId>` row (`paymentStatus=paid`, `fulfillmentStatus=processing`, `sellerId`, `customRequestId`) using the buyer's address from the Accept & pay form (falling back to their saved address). Same fulfillment rules then apply.
- **Stuck-order admin alert**: `backend/src/services/stuckFulfillmentSweep.js` runs at boot + every 6 h and flags orders that have sat in `fulfilled` for > 5 days (one-shot per order via `adminStuckAlertedAt`).

## AfterShip webhook

**Status: env var generated and stored on the Droplet, but the webhook is NOT yet registered in the AfterShip dashboard (waiting on a plan upgrade).** Until then, orders won't auto-flip from `shipped → delivered` — everything else (registering trackings, buyer "Check Status" checkpoints, ship-side push notifications) still works.

- **Endpoint**: `POST https://api.thailandpanties.com/api/aftership/webhook` (mounted under `/api`).
- **Auth**: backend reads `AFTERSHIP_WEBHOOK_SECRET` and accepts it via header `x-aftership-secret`, header `aftership-hmac-sha256`, or `?secret=` query string (in that order).
- **Subscribe to** the `Delivered` event at minimum; the backend ignores any other tag.
- **Re-register pending in the AfterShip dashboard**: Settings → Notifications → Webhooks → Add Webhook. Use the URL above and add a custom header `x-aftership-secret: <value of AFTERSHIP_WEBHOOK_SECRET>`. If the plan tier doesn't expose custom headers, append `?secret=<value>` to the URL.
- **Smoke test once registered**: AfterShip's "Send test event" should return `200 OK`. The body will look like `{"ok":true,"ignored":true,"reason":"no matching order"}` for synthetic test trackings — that confirms auth + reachability.
- **Secret value**: stored in `/opt/tp/deploy/.env.backend` on the Droplet (also backed up at `.env.backend.bak.aftership`). Never commit it.
- **Note**: only orders whose tracking was registered via our backend (`POST /api/orders/:orderId/tracking`, which writes `aftershipTrackingId` onto the order) match webhook events. Trackings created directly inside AfterShip's UI won't match anything.

---

*Last updated: AfterShip webhook plumbing (env wired, dashboard registration pending); fulfillment workflow (`processing → fulfilled → shipped → delivered`) for both orders and custom requests; stuck-order admin sweep.*
