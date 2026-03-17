# Launch Checklist

## Environment

- Set `VITE_API_BASE_URL` to your live API endpoint (or leave blank only if same-origin `/api` is intentional).
- Set `VITE_APP_BASE_URL` to your public site domain.
- Set `VITE_SEED_ADMIN_EMAIL` and `VITE_SEED_ADMIN_PASSWORD` to non-demo values.
- Keep `VITE_ENABLE_LOGIN_ALIASES=false` for production unless explicitly required.
- Keep `VITE_ENABLE_PROD_DATA_MIGRATION_RESET=false` in production (recommended default).

## Build And Deploy

- Run `npm run build` and confirm no errors.
- Run `npm run smoke` with frontend + backend running and confirm all checks pass.
- Deploy `dist/` artifacts to your hosting target.
- Verify your hosting serves SPA routes (fallback to `index.html`).

## Critical Smoke Tests

- Auth: login/logout for buyer, seller, bar, admin.
- Wallet: buyer top-up flow for credit card and PromptPay QR generation.
- Checkout: add to cart, complete checkout, order appears in account/admin.
- Messaging: buyer-seller and bar message threads send/receive.
- Payouts: create payout run, mark item sent/failed, verify notification and payout history CSV exports.
- Sales filters: confirm all time/current month/current pay cycle filters update summary + leaderboard.

## Admin Safety Checks

- Confirm PromptPay receiver mobile is set in site settings.
- Confirm payout threshold/hold behavior matches policy (>= 100 THB and 14-day hold).
- Confirm no test/demo account credentials are shared publicly.

## Observability

- Monitor browser console for runtime errors after deploy.
- Verify backend status is connected where API is expected.
- Spot-check email delivery logs and webhook/notification events.
