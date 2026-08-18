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
  new migration that corrects it.
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

## Payment, email, and SMS provider status

Explicitly, as of Phase 9:

- **Payment provider:** abstraction implemented
  (`services/providers/paymentProvider.js`); live payment processing is
  **not configured**. `POST /billing/upgrade` always returns a clear
  "not connected yet" error rather than pretending to start a checkout.
  `POST /payments/webhook` rejects every call (no signature can verify
  against a provider that doesn't exist) rather than trusting an
  unverified body. Order payment status (`orders.payment_status`) is only
  ever changed by an admin manually (`PATCH /admin/orders/:id/status`) —
  a real, audited, manual reconciliation action standing in for the
  webhook that doesn't exist yet, never an automated/fake charge.
- **Email provider:** abstraction implemented
  (`services/providers/emailProvider.js`); no SMTP credentials
  configured. Every call reports `{ status: 'unavailable' }`.
- **SMS provider:** abstraction implemented
  (`services/providers/smsProvider.js`); no SMS gateway configured. Same
  honest-unavailable behavior. This is also what "Try Our Service"
  (`/try`, `POST /public/orders/try`) depends on for real WhatsApp/SMS
  delivery — today it only ever saves a real `orders` row and shows a
  "Ready to send — delivery integration coming in Phase 2" message.
- **Image storage provider:** abstraction implemented
  (`services/providers/imageStorageProvider.js`), reusing the already-
  reserved `CLOUDINARY_*` env vars; no credentials configured. `POST
  /uploads/images` performs real validation (mime type, 5MB size limit,
  via `multer` memory storage — a file is never written to this server's
  disk) independent of the provider, then reports `{ status: 'unavailable'
  }` rather than faking a successful upload. The invitation builder still
  uses paste-a-URL fields and doesn't call this endpoint yet.

Connecting a real provider means implementing the `send`/
`createCheckout`/`verifyWebhookSignature`/`uploadImage` bodies in these
four files — nothing else in the codebase needs to change, since every
caller already goes through these interfaces.

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

## Known limitations (honest, as of Phase 9)

- No live MySQL database has been available in any environment this
  project has been developed in. Every phase's backend work has been
  verified for correct routing, validation, and auth/ownership
  enforcement without a live DB (including targeted validator unit tests
  and hand-signed JWTs to reach past `authenticate`), but no actual
  row has ever been created, read, updated, or deleted through the API.
- Payment, email, SMS, and image storage are architecturally ready but
  not connected — see above. "Try Our Service" saves a real order but
  does not send a real WhatsApp/SMS message; the invitation builder still
  uses paste-a-URL image fields, not the new upload endpoint.
- Analytics is a single aggregate view counter per event, not
  per-visitor/unique-visitor tracking — a deliberate scope decision (see
  `docs/architecture.md`) to avoid both privacy overreach and unbounded
  per-view row growth.
- No automated backup job runs anywhere yet — the cron example above is
  documentation, not something this repo executes.
