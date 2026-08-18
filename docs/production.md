# CardHub — production readiness notes

This document covers what's needed to run CardHub in production, and is
honest about what's configured versus what's architecturally ready but
not yet connected. Nothing described as "not configured" here has been
faked anywhere in the codebase — see `docs/architecture.md` for how each
placeholder actually behaves.

## Infrastructure target

As established in Phase 1: **Contabo VPS + Nginx + PM2** for the API,
**Netlify** for the frontend, **Cloudflare** in front for DNS/CDN/DDoS
mitigation, **Let's Encrypt** for TLS. Nothing has been deployed by any
phase so far — this repo has only ever run locally in this environment.

Production domain: **https://cardhub.co.tz**. The API listens on
**port 4006** (`PORT=4006`) and is reachable publicly at
**https://cardhub.co.tz/api/v1** via an Nginx reverse proxy; the frontend
build is served at the domain root. `FRONTEND_URL` (used for CORS and for
building links like the password-reset URL) must be set to
`https://cardhub.co.tz` in the API's production `.env` — see
[Environment variables](#environment-variables) below.

Suggested PM2 process for the API:

```bash
cd backend
npm install --omit=dev
npm run migrate
PORT=4006 pm2 start src/server.js --name cardhub-api
pm2 save
```

Nginx should terminate TLS for `cardhub.co.tz`, proxy `/api/` to
`http://127.0.0.1:4006` (the PM2-managed Node process — `127.0.0.1` here
is the loopback address Nginx uses to reach a same-host process, not a
public URL), and serve the frontend's static build (or let Netlify serve
it directly and just proxy the API subdomain). Example proxy block:

```nginx
server {
    server_name cardhub.co.tz;

    location /api/ {
        proxy_pass http://127.0.0.1:4006;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/cardhub/dist;
        try_files $uri /index.html;
    }
}
```

## Environment variables

See `backend/.env.example` for the full list. In production, `PORT=4006`,
`FRONTEND_URL=https://cardhub.co.tz`, and `API_URL=https://cardhub.co.tz/api/v1`
— the code already falls back to these same values when `NODE_ENV=production`
and the env vars are unset (`backend/src/config/env.js`), but setting them
explicitly in `.env` is still the supported, documented path. The frontend
build reads `VITE_API_URL` from `.env.production` (already committed at the
repo root, `VITE_API_URL=https://cardhub.co.tz/api/v1` — safe to commit
since Vite inlines `VITE_` vars into the public bundle regardless, so
there's no secret in it).

Every secret-shaped value
(`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DB_PASSWORD`, `SMTP_*`,
`SMS_*`, `CLOUDINARY_*`) must be set to real, unique values in production
— the fallbacks in `config/env.js` (`dev-access-secret`, etc.) exist only
so the server can boot in a credential-less local environment and must
never reach production. `.env` is gitignored on both projects; nothing
resembling a secret has been committed.

**Secret recovery:** if a secret is lost, generate a fresh one (e.g.
`openssl rand -base64 48` for JWT secrets) and redeploy — rotating
`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` invalidates every existing
session (acceptable; customers just log in again) and rotating
`DB_PASSWORD` requires updating it in MySQL and the `.env` together.
There is no other secret material to "recover" — CardHub doesn't encrypt
its own data at rest beyond bcrypt password hashes, which are one-way by
design and not recoverable (a forgotten password goes through the
existing forgot-password flow, not secret recovery).

## Database backup strategy

No automated backup system has been implemented — this is intentionally
left as an operational/infrastructure decision rather than something the
application should silently assume. Recommended approach for a
single-VPS MySQL deployment:

```bash
# Nightly dump, keep 14 days, via cron on the VPS
0 2 * * * mysqldump -u cardhub_backup -p"$DB_BACKUP_PASSWORD" cardhub | gzip > /var/backups/cardhub/cardhub-$(date +\%Y\%m\%d).sql.gz
find /var/backups/cardhub -name '*.sql.gz' -mtime +14 -delete
```

Ship the resulting dumps off-VPS (e.g. to Cloudflare R2 or another
object store) — a backup that lives only on the machine it's backing up
protects against nothing. Use a dedicated MySQL user with only
`SELECT`/`LOCK TABLES` for the backup job, not the application's own
`DB_USER`.

## Migration strategy

- Every schema change is a new file in `backend/src/database/migrations/`,
  numbered sequentially (currently 001–017), each with `-- +up` and
  `-- +down` sections, tracked in `schema_migrations`.
- **Never edit an already-applied migration.** If a mistake ships, write a
  new migration that corrects it. The one exception is a migration that
  **failed to apply** — MySQL never recorded it in `schema_migrations`
  (the runner only inserts that row after the `-- +up` SQL succeeds), so
  nothing was actually created and there's nothing to "un-apply." Migration
  016 hit exactly this case (see Known limitations below) and was
  corrected in place rather than superseded by a new file.
- Rollback: `npm run migrate:down` rolls back exactly the most recently
  applied migration, once. There is no bulk-rollback command by design —
  rolling back multiple migrations at once in production is exactly the
  kind of destructive, easy-to-fumble operation this project's own
  safety conventions (see the root `CLAUDE`-level git-safety guidance)
  argue against automating.
- Before running migrations against production data, take a fresh backup
  (see above) — migrations here are believed correct and have been
  syntax/logic-reviewed, but none have been executed against a live
  database in any environment this project has run in so far (see
  [Remaining issues](../README.md) in the README for the full list of
  phases where this applied).

## Health check semantics

`GET /api/v1/health` distinguishes two states without leaking internals:

- **App healthy, DB reachable:** `200`, `{ success: true, data: { status:
  "ok", database: "connected" } }`.
- **App running, DB unreachable:** `503`, `{ success: false, error: {
  code: "SERVICE_UNAVAILABLE" } }` — the message says the database is
  unreachable, never the underlying MySQL error (wrong password, host
  down, etc.), which stays server-side in the structured logs.

Point uptime monitoring (e.g. a Cloudflare health check or an external
pinger) at `https://cardhub.co.tz/api/v1/health`, not at an arbitrary API
route.

## Payment, email, SMS, and WhatsApp provider status

Explicitly, as of the Phase 9 correction:

- **Payment provider:** abstraction implemented
  (`services/providers/paymentProvider.js`); live payment processing is
  **not configured**, and no real transport code has been written yet
  (unlike image storage and SMS below) — `isConfigured` is hardcoded
  `false`. `POST /billing/upgrade` always returns a clear "not connected
  yet" error rather than pretending to start a checkout. `POST
  /payments/webhook` rejects every call (no signature can verify against a
  provider that doesn't exist) rather than trusting an unverified body.
  Order payment status (`orders.payment_status`) is only ever changed by
  an admin manually (`PATCH /admin/orders/:id/status`) — a real, audited,
  manual reconciliation action standing in for the webhook that doesn't
  exist yet, never an automated/fake charge.
- **Email provider:** abstraction implemented
  (`services/providers/emailProvider.js`); no SMTP credentials
  configured, no transport code written yet. Every call reports
  `{ status: 'unavailable' }`.
- **SMS provider (Beem):** `services/providers/smsProvider.js` has a
  **real** HTTP integration against Beem's documented `apisms.beem.africa`
  endpoint (Basic Auth with `BEEM_API_KEY`/`BEEM_SECRET_KEY`, `fetch`, no
  new dependency) — but `BEEM_API_KEY`/`BEEM_SECRET_KEY`/`BEEM_SENDER_ID`
  are unset in this environment, so `isConfigured` is `false` and every
  call still honestly reports `{ status: 'unavailable' }` without ever
  reaching the network. **This code has not been exercised against a real
  Beem account** — smoke-test it against one before relying on it in
  production. This is also what "Try Our Service" (`/try`, `POST
  /public/orders/try`) depends on for real SMS delivery — today it only
  ever saves a real `orders` row and shows a "Ready to send — delivery
  integration coming in Phase 2" message.
- **WhatsApp provider:** `services/providers/whatsappProvider.js` is a
  clean abstraction (`sendCardMessage`/`sendCardImage`) with **no real
  provider integrated yet** — deliberately, this phase only prepared the
  extension point. `WHATSAPP_PROVIDER` is unset, so `isConfigured` is
  always `false`. It's written so a real implementation can pick either
  Beem's WhatsApp API or Meta's WhatsApp Cloud API behind
  `env.whatsapp.provider` without changing any caller.
- **Image storage provider (Cloudinary):** `services/providers/imageStorageProvider.js`
  has a **real** Cloudinary SDK integration (base64 upload, `destroy`,
  `url` — the official `cloudinary` npm package) — but
  `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` are
  unset in this environment, so `isConfigured` is `false` and uploads
  still honestly report unavailable. **This code has not been exercised
  against a real Cloudinary account** — smoke-test it before relying on
  it. `POST /uploads/images` performs real validation (mime type, 5MB size
  limit, via `multer` memory storage — a file is never written to this
  server's disk) independent of the provider. This is for
  **customer-uploaded** images only; it's unrelated to the
  [real card catalogue](../README.md#real-card-catalogue-phase-9-correction),
  which uses manually-supplied local files under `public/cards/`, not
  Cloudinary. The invitation builder still uses paste-a-URL fields and
  doesn't call this endpoint yet.

Connecting the two providers that still have no transport code
(payment, email) means implementing their `createCheckout`/
`verifyWebhookSignature`/`send` bodies. Connecting WhatsApp means picking
a provider and implementing `sendCardMessage`/`sendCardImage`. Beem SMS
and Cloudinary already have real transport code — connecting them is
purely a matter of setting the right environment variables and verifying
against a real account. Nothing else in the codebase needs to change in
any case, since every caller already goes through these five interfaces.

## Security posture summary

Carried forward from every earlier phase and re-verified in Phase 9:

- Every mutating endpoint requires `authenticate`; admin endpoints
  additionally require `authorize('admin')` — verified live in this
  phase with hand-signed customer vs. admin JWTs (403 vs. pass-through),
  including the new `/orders`, `/uploads/images`, `/admin/orders`, and
  `/admin/templates/:id/pricing-tier` endpoints.
- Ownership is enforced in the query itself (`WHERE id = ? AND user_id =
  ?`), not as an after-the-fact check, for events, guests, notifications,
  and orders alike.
- Plan limits (`services/plan.service.js`) are enforced in the same
  services that create resources — a disabled frontend button is UX only,
  the backend re-checks independently on every create/publish/guest-add.
- Order pricing (`unit_price_tzs`/`subtotal_tzs`) is always computed
  server-side from the template's assigned pricing tier
  (`constants/pricingTiers.js`) in `orders.service.js` — a client can send
  any `templateId` it likes, but never a price.
- Public endpoints (`/public/invitations/:slug`, its `/rsvp` submission,
  and `/public/orders/try`) never require a JWT and return deliberately
  minimal DTOs — see `docs/architecture.md` → "Public API data
  minimization".
- Image uploads (`POST /uploads/images`) are validated by `multer`
  independent of whether a storage provider is configured: disallowed
  mime types and oversized files (>5MB) are rejected before the request
  body is ever fully buffered, and nothing is ever written to this
  server's disk.
- Rate limiting: `authLimiter` (login/register/reset), `writeLimiter`
  (general authenticated mutations, including admin/billing/order-status
  writes), `rsvpLimiter` (20/hour/IP on public RSVP submission),
  `tryServiceLimiter` (10/hour/IP on the public Try Our Service
  submission — tighter than RSVP since this is a single-visitor lead-gen
  form, not a household responding for several guests). The payment
  webhook is deliberately **not** rate-limited — a real provider controls
  its own retry volume, and the signature check (which currently rejects
  everything) is the actual gate, not request frequency.
- No stack traces, SQL errors, or filesystem paths are ever returned to a
  client — `middleware/errorHandler.js` normalizes everything to the
  standard envelope and only logs detail server-side.

## Known limitations (honest, as of the Phase 9 correction)

- No live MySQL database has been available in any environment this
  project has been developed in. Every phase's backend work has been
  verified for correct routing, validation, and auth/ownership
  enforcement without a live DB (including targeted validator unit tests
  and hand-signed JWTs to reach past `authenticate`), but no actual
  row has ever been created, read, updated, or deleted through the API.
  **This includes migration 016** — it originally failed against a real
  MySQL 8 database (error 3823: a CHECK constraint can't reference a
  column that also carries an `ON DELETE SET NULL` foreign-key action).
  It's been corrected here (the CHECK moved to application-layer
  enforcement in `orders.service.js#assertHasContact` — see
  `docs/architecture.md`), but that correction has **not** been verified
  by re-running it against a real database in this environment, because
  none is available here either. Re-run
  `mysql -u root -p cardhub < backend/src/database/migrations/016_create_orders_table.sql`
  (or `npm run migrate`) against the real database and confirm it
  succeeds before treating this as production-ready.
- Payment and email have no real transport code yet. SMS (Beem) and
  image storage (Cloudinary) have real transport code but no real
  credentials in this environment, and **neither has been exercised
  against a real account** — smoke-test both before relying on them.
  WhatsApp has an abstraction but no provider chosen yet. "Try Our
  Service" saves a real order but does not send a real SMS/WhatsApp
  message; the invitation builder still uses paste-a-URL image fields,
  not the new upload endpoint.
- Analytics is a single aggregate view counter per event, not
  per-visitor/unique-visitor tracking — a deliberate scope decision (see
  `docs/architecture.md`) to avoid both privacy overreach and unbounded
  per-view row growth.
- No automated backup job runs anywhere yet — the cron example above is
  documentation, not something this repo executes.
