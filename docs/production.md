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

Suggested PM2 process for the API:

```bash
cd backend
npm install --omit=dev
npm run migrate
pm2 start src/server.js --name cardhub-api
pm2 save
```

Nginx should terminate TLS, proxy `/api/` to the PM2-managed Node
process, and serve the frontend's static build (or let Netlify serve it
directly and just proxy the API subdomain).

## Environment variables

See `backend/.env.example` for the full list. Every secret-shaped value
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
  numbered sequentially (currently 001–015), each with `-- +up` and
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
pinger) at this endpoint, not at an arbitrary API route.

## Payment, email, and SMS provider status

Explicitly, as of Phase 8:

- **Payment provider:** abstraction implemented
  (`services/providers/paymentProvider.js`); live payment processing is
  **not configured**. `POST /billing/upgrade` always returns a clear
  "not connected yet" error rather than pretending to start a checkout.
  `POST /payments/webhook` rejects every call (no signature can verify
  against a provider that doesn't exist) rather than trusting an
  unverified body.
- **Email provider:** abstraction implemented
  (`services/providers/emailProvider.js`); no SMTP credentials
  configured. Every call reports `{ status: 'unavailable' }`.
- **SMS provider:** abstraction implemented
  (`services/providers/smsProvider.js`); no SMS gateway configured. Same
  honest-unavailable behavior.

Connecting a real provider means implementing the `send`/
`createCheckout`/`verifyWebhookSignature` bodies in these three files —
nothing else in the codebase needs to change, since every caller already
goes through these interfaces.

## Security posture summary

Carried forward from every earlier phase and re-verified in Phase 8:

- Every mutating endpoint requires `authenticate`; admin endpoints
  additionally require `authorize('admin')` — verified live in this
  phase with hand-signed customer vs. admin JWTs (403 vs. pass-through).
- Ownership is enforced in the query itself (`WHERE id = ? AND user_id =
  ?`), not as an after-the-fact check, for events, guests, and
  notifications alike.
- Plan limits (`services/plan.service.js`) are enforced in the same
  services that create resources — a disabled frontend button is UX only,
  the backend re-checks independently on every create/publish/guest-add.
- Public endpoints (`/public/invitations/:slug`, its `/rsvp` submission)
  never require a JWT and return deliberately minimal DTOs — see
  `docs/architecture.md` → "Public API data minimization".
- Rate limiting: `authLimiter` (login/register/reset), `writeLimiter`
  (general authenticated mutations, now including admin and billing
  writes), `rsvpLimiter` (20/hour/IP on public RSVP submission — high
  enough for a family responding for several guests, low enough to blunt
  scripted flooding). The payment webhook is deliberately **not**
  rate-limited — a real provider controls its own retry volume, and the
  signature check (which currently rejects everything) is the actual
  gate, not request frequency.
- No stack traces, SQL errors, or filesystem paths are ever returned to a
  client — `middleware/errorHandler.js` normalizes everything to the
  standard envelope and only logs detail server-side.

## Known limitations (honest, as of Phase 8)

- No live MySQL database has been available in any environment this
  project has been developed in. Every phase's backend work has been
  verified for correct routing, validation, and auth/ownership
  enforcement without a live DB (including targeted validator unit tests
  and hand-signed JWTs to reach past `authenticate`), but no actual
  row has ever been created, read, updated, or deleted through the API.
- Payment, email, and SMS are architecturally ready but not connected —
  see above.
- Analytics is a single aggregate view counter per event, not
  per-visitor/unique-visitor tracking — a deliberate scope decision (see
  `docs/architecture.md`) to avoid both privacy overreach and unbounded
  per-view row growth.
- No automated backup job runs anywhere yet — the cron example above is
  documentation, not something this repo executes.
