# CardHub

**Create. Invite. Celebrate.**

CardHub is a premium digital invitation and event platform by **Clix Digital
Works** (Tanzania). This repository currently implements:

- **Phase 1 — Foundation, Architecture & Brand System**
- **Phase 2 — Public Website + Authentication + Customer Account**
- **Phase 3 — Event Creation + Template Engine + Invitation Data Model**
- **Phase 4 — Invitation Builder Engine**
- **Phase 5 — Public Invitation + Publishing Engine**
- **Phase 6 — Guest Management + RSVP Engine**
- **Phase 7 — Messaging + Notifications + Sharing**
- **Phase 8 — Billing + Admin + Analytics + Production Hardening**

Payment processing, live email delivery, and SMS delivery are
architecturally wired but not connected to a real provider — see
[Payment, email, and SMS provider status](docs/production.md#payment-email-and-sms-provider-status).
QR check-in, an affiliate program, and a vendor marketplace are not part
of this build — see [Roadmap](#roadmap).

## Tech stack

**Frontend** — React 19, Vite, React Router, Axios, React Icons, pure CSS
(no Tailwind/Bootstrap/UI kits — the design system lives in
`src/styles/tokens.css`).

**Backend** — Node.js, Express, MySQL 8 (via `mysql2`), JWT auth
(`jsonwebtoken`), `bcryptjs`, a hand-rolled SQL migration runner.

**Infrastructure target** — Contabo VPS + Nginx + PM2 + Cloudflare + Let's
Encrypt for the API, Netlify for the frontend. Nothing is deployed by this
phase; the architecture is just compatible with that target.

## Project structure

```text
cardhub/
  src/                    # Frontend (Vite root)
    components/
      ui/                 # Button, Input, Modal, Toast, Switch, ColorField, Accordion, etc.
      layout/              # Navbar, Footer, Sidebar, Topbar
      common/              # Container, PageHeader, Seo, InvitationPreview, Pagination
      templates/           # TemplateCard, TemplateFilters — shared by /templates and the wizard
      events/              # EventCard, EventDetailsForm, Delete/ChangeTemplate/Publish modals
      guests/              # GuestStatsBar, GuestStatusBadge, GuestFormModal, BulkImportModal
      invitation/           # InvitationRenderer + sections/ — THE one invitation rendering engine (incl. RsvpSection)
    pages/
      public/              # Templates, Pricing, ..., FAQ, Terms, Privacy, InvitationPage (/invite/:slug)
      auth/                # Register, Login, Forgot/Reset password
      dashboard/
        settings/           # Profile, Security, Notifications, Language
        events/              # Create wizard, My Events, event workspace (Overview/Settings/Guests/Analytics)
          builder/            # InvitationBuilderPage + its panels — the invitation builder
          guests/              # GuestsPage
        BillingPage.jsx        # Plan, usage, payment history (Phase 8)
        NotificationsPage.jsx  # Notification center (Phase 7)
      admin/                 # AdminDashboard/Users/Events/Templates/AuditLogs pages (Phase 8)
    layouts/               # PublicLayout, AuthLayout, DashboardLayout, AdminLayout
    routes/                # AppRoutes, ProtectedRoute, AdminRoute
    hooks/                  # useAuth, useToast, useTemplateCatalog, useCanvasScale, useMediaQuery, ...
    context/                # AuthContext, ToastContext
    services/               # axios instance + API service modules
    utils/                  # incl. shareMessage.js (WhatsApp/native share)
    constants/              # routes, eventTypes, invitationSections, fonts, plans, rsvpStatus, pricing/faq demo data
    styles/                 # tokens.css, typography.css, base.css, animations.css

  backend/
    src/
      config/ controllers/ services/ repositories/ routes/v1/ middleware/ validators/ utils/ constants/
        services/providers/  # emailProvider, smsProvider, paymentProvider — honest "unavailable" abstractions
      database/
        migrations/         # hand-rolled up/down SQL migrations
        seeds/               # dev-only seed scripts (clearly labeled)
      app.js
      server.js

  docs/                    # architecture notes, production.md
```

## Local setup

### Frontend

```bash
npm install
cp .env.example .env.local   # only needed if the API isn't on the default URL
npm run dev                  # http://localhost:5173
```

### Backend

```bash
cd backend
npm install
cp .env.example .env         # fill in real DB credentials and JWT secrets
npm run migrate              # creates/updates all tables through migration 015
npm run seed                 # baseline system_settings + the event_templates catalog
npm run dev                  # http://localhost:4006
```

The server starts even if MySQL is unreachable (it logs a warning); only
DB-backed endpoints will fail until the connection is valid.

**Production:** the API listens on port **4006** (`PORT=4006`), served at
**https://cardhub.co.tz/api/v1** behind Nginx, with CORS restricted to
**https://cardhub.co.tz**. See [`docs/production.md`](docs/production.md).

> **Known gap:** migrations have not been run against a live database in
> this environment (no MySQL credentials were available). Run `npm run
> migrate && npm run seed` before testing any flow end to end — see
> [Remaining issues](#remaining-issues-carried-forward).

## Environment variables

See `.env.example` (frontend, repo root) and `backend/.env.example` (API).
Never commit a real `.env` file — both are gitignored.

Frontend: `VITE_API_URL`.

Backend: `NODE_ENV`, `PORT`, `DB_HOST/PORT/NAME/USER/PASSWORD`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`,
`JWT_REFRESH_EXPIRES`, `CLOUDINARY_*` (still reserved/unused — see
[Image handling](#image-handling-phase-4)), `FRONTEND_URL`, `API_URL`,
`SMTP_*` and `SMS_*` (Phase 7, reserved — see
[Payment, email, and SMS provider status](docs/production.md#payment-email-and-sms-provider-status)).

## Database & migrations

```bash
npm run migrate        # apply all pending migrations
npm run migrate:down    # roll back the most recently applied migration
npm run seed             # baseline system_settings + event_templates catalog (idempotent)
```

Tables:

| # | Table / change | Added in |
|---|---|---|
| 001 | `users` | Phase 1 |
| 002 | `refresh_tokens` | Phase 1 |
| 003 | `audit_logs` | Phase 1 |
| 004 | `system_settings` | Phase 1 |
| 005 | `password_reset_tokens` | Phase 2 |
| 006 | `user_preferences` | Phase 2 |
| 007 | unique constraint on `users.phone` | Phase 2 |
| 008 | `event_templates` | Phase 3 |
| 009 | `events` | Phase 3 |
| 010 | `events.invitation_config` (JSON) | Phase 4 |
| 011 | `guests` | Phase 6 |
| 012 | `notifications` | Phase 7 |
| 013 | `subscriptions` | Phase 8 |
| 014 | `payments` | Phase 8 |
| 015 | `events.view_count` | Phase 8 |

Never modify an already-applied migration by hand — add a new one instead.
Rollback and backup strategy: see [`docs/production.md`](docs/production.md).

## Commands

| Location | Command | Purpose |
|---|---|---|
| root | `npm run dev` | Start the Vite dev server |
| root | `npm run build` | Production frontend build |
| root | `npm run lint` | Lint the frontend |
| backend | `npm run dev` | Start the API with nodemon |
| backend | `npm run lint` | Lint the API |
| backend | `npm run migrate` / `migrate:down` | Apply / roll back migrations |
| backend | `npm run seed` | Insert baseline settings + template catalog |

## API structure

All routes are versioned under `/api/v1`, same envelope as always:

```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "...", "error": { "code": "...", "details": [] } }
```

**Owner-facing (authenticated, ownership-scoped):**

```text
GET    /api/v1/events                 # paginated, scoped to req.user.id
POST   /api/v1/events
GET    /api/v1/events/:id
PATCH  /api/v1/events/:id
DELETE /api/v1/events/:id             # soft delete
POST   /api/v1/events/:id/duplicate
PATCH  /api/v1/events/:id/template

GET    /api/v1/events/:id/invitation  # the builder's config
PATCH  /api/v1/events/:id/invitation

POST   /api/v1/events/:id/publish
POST   /api/v1/events/:id/unpublish

GET    /api/v1/events/:id/analytics   # view count + RSVP breakdown (Phase 8)

GET    /api/v1/events/:id/guests             # nested under events — Phase 6
POST   /api/v1/events/:id/guests
GET    /api/v1/events/:id/guests/stats
PATCH  /api/v1/events/:id/guests/:guestId
DELETE /api/v1/events/:id/guests/:guestId
POST   /api/v1/events/:id/guests/bulk-delete
POST   /api/v1/events/:id/guests/bulk-import

GET    /api/v1/notifications          # scoped to req.user.id only — Phase 7
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/notifications/read-all

GET    /api/v1/billing/summary        # plan, usage, payment history — Phase 8
POST   /api/v1/billing/upgrade        # honest 501/error — no payment provider connected
```

**Public catalog (no auth):**

```text
GET    /api/v1/templates
GET    /api/v1/templates/:id
```

**Public invitation (no auth, separate module from the owner-facing event API on purpose):**

```text
GET    /api/v1/public/invitations/:slug
POST   /api/v1/public/invitations/:slug/rsvp   # rate-limited, Phase 6
```

Only returns published, non-deleted events, through a dedicated DTO
(`toPublicInvitationDTO`) that excludes `id`, `user_id`, `status`,
timestamps, and template id/status — see
[`docs/architecture.md`](docs/architecture.md#public-api-data-minimization).

**Admin (Phase 8, `authenticate` + `authorize('admin')`):**

```text
GET    /api/v1/admin/stats
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id/status
GET    /api/v1/admin/events            # read-only by design
GET    /api/v1/admin/templates
PATCH  /api/v1/admin/templates/:id/status
GET    /api/v1/admin/audit-logs
```

**Webhook (no JWT — authenticates via provider signature, currently always rejects since no provider is connected):**

```text
POST   /api/v1/payments/webhook
```

Plus everything from earlier phases: `/auth/*`, `/users/me*`, `/contact`,
`/health`. `affiliates` remains a reserved placeholder (`501`) — out of
scope for Phases 1–8.

## The invitation renderer (Phase 4 + 5)

**One renderer, three contexts, zero duplication.**
`src/components/invitation/InvitationRenderer.jsx` takes `event` + `config`
(the invitation config) + `templateConfig` (the template's defaults) and
renders the actual invitation. The exact same component is:

- embedded (scaled via CSS `transform`, not a second render path) in the
  builder canvas and the event workspace overview, through
  `InvitationCanvasEmbed`,
- shown at full size in the builder's "Preview" overlay,
- rendered at full size on the public `/invite/:slug` page.

Builder state is entirely local (no API call per keystroke) — the
customer clicks **Save** to persist, with explicit `Saving… / Saved /
Save failed — Retry` states. See
[`docs/architecture.md`](docs/architecture.md#invitation-config-architecture)
for the config schema, the section system, and how template defaults and
event-level overrides are layered.

## Image handling (Phase 4)

No file upload / storage infrastructure exists (no Cloudinary credentials
were available, and none were invented). Cover images, background images,
and gallery images are all **paste-a-URL** fields: the customer links to
an already-hosted image. The backend validates the URL is `https(s)` with
a plausible image extension before storing it — real, working validation,
not a fake upload progress bar. Wiring up actual storage (Cloudinary or
S3-compatible) is future work, tracked in [Remaining issues](#remaining-issues-carried-forward).

## Roadmap

1. **Foundation, Architecture & Brand System** — done.
2. **Public Website + Authentication + Customer Account** — done.
3. **Event Creation + Template Engine + Invitation Data Model** — done.
4. **Invitation Builder Engine** — done.
5. **Public Invitation + Publishing Engine** — done.
6. **Guest Management + RSVP Engine** — done, this repo.
7. **Messaging + Notifications + Sharing** — done, this repo (email/SMS are
   abstracted but not connected to a live provider — see
   [`docs/production.md`](docs/production.md)).
8. **Billing + Admin + Analytics + Production Hardening** — done, this
   repo (payment processing is abstracted but not connected — see
   [`docs/production.md`](docs/production.md)).

Not part of this build: QR check-in, an affiliate/referral program, and a
vendor marketplace — these were explicitly out of scope for Phases 1–8.

## Remaining issues (carried forward)

- **No live MySQL database has been available in any environment this
  project has been developed in**, across all 8 phases. Every route was
  verified for correct auth-guarding, ownership-query shape, and payload
  validation (including standalone unit tests of validators against
  XSS/malformed/oversized payloads, and hand-signed JWTs to reach past
  `authenticate`/`authorize`), and UI flows were verified live with local
  sample data — but no actual database row has ever been created, edited,
  published, or fetched through the API in this environment. Run
  `npm run migrate && npm run seed` against a real database before
  testing any flow end to end.
- No real image storage — see [Image handling](#image-handling-phase-4).
- Payment, email, and SMS are architecturally wired (provider abstraction,
  server-side call sites, honest "unavailable"/"not connected" responses)
  but not connected to a live provider — see
  [`docs/production.md`](docs/production.md#payment-email-and-sms-provider-status).
  Password reset and the contact form both work end-to-end on the backend
  but stop at "log it / store it," same as earlier phases.
- Analytics is a single aggregate view counter per event (`events.view_count`,
  incremented fire-and-forget on each public fetch), not per-visitor
  tracking — a deliberate scope decision, see
  [`docs/architecture.md`](docs/architecture.md).
- The builder's in-app "unsaved changes" guard only covers the builder's
  own Back button (a custom Modal, per spec) and a `beforeunload` browser
  warning for tab close/refresh. It does **not** intercept navigating away
  via the browser back button or an arbitrary link click while the builder
  is mounted — the app uses a plain `<BrowserRouter>`, and reliably
  blocking in-app navigation everywhere requires React Router's data-router
  `useBlocker`, which would mean migrating routing setup app-wide. That
  felt like too large and risky a change to fold into this phase; flagging
  it as a known gap rather than silently scoping it out.
- No automated database backup job exists yet — see
  [`docs/production.md`](docs/production.md) for the documented (not yet
  implemented) strategy.
