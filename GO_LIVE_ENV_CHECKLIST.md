# Go-Live Env Checklist

Use this checklist before deploying to production.

## Frontend (`frontend/.env`)

- `VITE_API_BASE_URL=https://<your-api-domain>`
- `VITE_APP_BASE_URL=https://<your-frontend-domain>`
- `VITE_SEED_ADMIN_EMAIL=<real-admin-email>`
- `VITE_SEED_ADMIN_PASSWORD=<strong-random-password>`
- `VITE_SEED_DEMO_PASSWORD=<strong-random-password-or-disable-demo-seeding>`
- `VITE_ENABLE_LOGIN_ALIASES=false`
- `VITE_REQUIRE_BACKEND_AUTH=true`
- `VITE_ENABLE_PROD_DATA_MIGRATION_RESET=false`

## Backend (`backend/.env`)

- `NODE_ENV=production`
- `PORT=<server-port>` (e.g. `4000`)
- `CLIENT_ORIGIN=https://<your-frontend-domain>`
- `JWT_SECRET=<64+ char random secret>` **REQUIRED**
- `JWT_EXPIRES_IN=12h` (or your preferred policy)
- `DATABASE_URL=<postgres-connection-string>` **REQUIRED**
- `DATABASE_SSL_REQUIRE=true` (recommended for hosted DB)
- `EMAIL_MODE=live` (use `test` before full launch)
- `EMAIL_TEST_RECIPIENTS=<comma-separated-emails>` (only for test mode)
- `ADMIN_EMAIL=<real-admin-email>`
- `SMTP_HOST=<smtp-host>`
- `SMTP_PORT=<smtp-port>` (often `587`)
- `SMTP_SECURE=false` (or `true` for SSL-only providers)
- `SMTP_USER=<smtp-username>`
- `SMTP_PASS=<smtp-password>`
- `SMTP_FROM=<no-reply@your-domain>`
- `VAPID_PUBLIC_KEY=<web-push-public-key>`
- `VAPID_PRIVATE_KEY=<web-push-private-key>`
- `VAPID_SUBJECT=mailto:<admin-email>`
- `ALLOW_LEGACY_PLAINTEXT_PASSWORDS=false`

## Secure value generation

- JWT secret (PowerShell):
  - `[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))`
- Strong password (PowerShell):
  - `[System.Web.Security.Membership]::GeneratePassword(24,4)`

## Final pre-deploy checks

- Frontend: `npm run build`
- Frontend + backend running: `npm run smoke`
- Backend readiness: `GET /api/health/ready` returns `ok: true`
- Confirm `/api/bootstrap` response has no `password`/`passwordHash` fields
