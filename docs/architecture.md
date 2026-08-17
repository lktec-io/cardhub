# CardHub architecture notes

## Backend layering

Requests flow `routes → controller → service → repository`. Each layer has
one job:

- **routes/v1/\*.routes.js** — wires an HTTP method + path to a controller
  function. No logic.
- **controllers/** — parse the request, call a validator, call the service,
  shape the response via `sendSuccess`/`sendError`. No SQL, no business
  rules.
- **services/** — business logic (e.g. `auth.service.js` decides whether a
  login is allowed, issues tokens, writes an audit log). Services call
  repositories, never `pool` directly.
- **repositories/** — the only layer that touches `mysql2`. Every query is
  parameterized; nothing here concatenates user input into SQL.
- **validators/** — hand-rolled request-shape checks that throw
  `ApiError.validation(...)` before a controller calls its service. No
  external validation library was added to keep the dependency surface
  small; swap in something heavier only if validation rules get
  genuinely complex.

Cross-cutting concerns (auth, rate limiting, logging, error formatting)
live in `middleware/` and are wired once in `app.js`, not repeated per
route.

### Why routes exist for unimplemented modules

`routes/v1/*.routes.js` for `guests`, `rsvp`, `payments`, etc. are mounted
in Phase 1 but every one just runs `notImplemented(moduleName)`, returning
a `501` with the standard error envelope. This reserves the URL space (so
a later phase doesn't renegotiate paths with the frontend) without writing
fake business logic against tables that don't exist yet. `events` was one
of these placeholders through Phase 2; Phase 3 replaced it with a real
implementation (see below) — the same pattern will retire `guests`,
`rsvp`, etc. one phase at a time.

### Auth foundation

`auth.service.js` is the one feature implemented end-to-end in Phase 1,
because "authentication foundation" only means something if it's proven
working:

- Passwords hashed with `bcryptjs` (12 rounds), never logged (`logger.js`
  redacts known-sensitive keys).
- Access tokens are short-lived JWTs (`JWT_ACCESS_EXPIRES`, default 15m)
  carrying `{ sub, role }`, verified by `middleware/authenticate.js`.
- Refresh tokens are long-lived JWTs, but the API never trusts the JWT
  alone for refresh/logout — it stores a SHA-256 hash of each issued
  refresh token in `refresh_tokens` and checks `revoked_at`/`expires_at`
  there, so logout actually invalidates the session server-side instead of
  just deleting a cookie.
- `middleware/authorize(...roles)` is separate from `authenticate` so a
  route can require "logged in" without yet caring which of
  `customer / admin / affiliate / event_staff` is calling — later phases
  layer role checks on top without touching the auth flow itself.

### Session refresh (Phase 2)

`POST /auth/refresh` reads the refresh token from the `httpOnly` cookie
(never from the request body — a client-supplied refresh token would be
pointless to trust), verifies the JWT, checks the matching `refresh_tokens`
row is still valid, then **rotates**: revokes that row and issues a brand
new access/refresh pair. A stolen, already-used refresh token stops working
the moment the legitimate client rotates it.

On the frontend, `src/services/api.js` reacts to any `401` by calling
`/auth/refresh` once and retrying the original request. Two details keep
this from breaking:

- A per-request `_retry` flag stops a request from being retried twice —
  if the retried request also 401s, the session is cleared instead of
  looping forever.
- Concurrent requests that all 401 at once (e.g. three widgets fetching on
  mount) share a single in-flight refresh promise (`refreshPromise` in
  `api.js`) instead of each firing its own `/auth/refresh` call.
- `/auth/login`, `/auth/register`, `/auth/refresh`, and `/auth/logout`
  themselves are exempt from the retry logic — a failed login should show
  "invalid credentials," not silently attempt a refresh.

### Password reset (Phase 2)

`password_reset_tokens` follows the same shape as `refresh_tokens`: the
raw token is emailed/returned to the user, only its SHA-256 hash is
stored, and it's single-use (`used_at`) with a 1-hour expiry. No email
provider is wired up yet, so `authService.forgotPassword` logs the reset
URL server-side and — **only when `NODE_ENV !== 'production'`** — returns
it in the API response so the flow is testable without an inbox. The
response message is identical whether or not the email is registered, to
avoid leaking which addresses have accounts. Completing a reset revokes
every refresh token for that user, forcing re-login on all other devices.

### Account ownership / IDOR protection

Every customer self-service endpoint lives under `/users/me*`, never
`/users/:id`. The controller reads `req.user.id` — set by the
`authenticate` middleware from the verified JWT — and that's the only
source of identity the service layer ever sees; no id is accepted from the
request body or URL for these routes. `routes/v1/users.routes.js` mounts
`authenticate` for the entire router, then defines the three `/me*` routes
explicitly; anything else under `/users` (a future admin listing or
look-up-by-id endpoint) falls through to `notImplemented`, so it's `501`
today rather than an accidentally-open door.

## Events & templates (Phase 3)

### Template vs. event responsibilities

A **template** (`event_templates`) is system-owned design metadata: name,
category, a `config` JSON blob (`{ theme, layout, colors: { primary,
accent }, fonts: { heading, body } }`), status (`active`/`inactive`), and
`sort_order`. Customers select a template; they never create, edit, or own
one — there is deliberately no `PATCH /templates/:id` or "my templates"
concept.

An **event** (`events`) is the customer-owned record: `user_id`,
`template_id` (a reference, not a copy), title, event type, status, slug,
date/time/timezone, venue, description, host name. It is the only
customer-owned business entity Phase 3 introduces.

### Event ownership & IDOR protection

Every write path goes through `eventRepository`, and every method that
touches a specific event takes **both** the event id and the authenticated
`userId`, filtering on both in the same SQL statement —
`findByIdAndUserId`, `updateByIdAndUserId`, `updateTemplateByIdAndUserId`,
`softDeleteByIdAndUserId`. There is no `findById(id)` alone available to
the service layer for customer-facing operations, so it's structurally
impossible for a route handler to "forget" the ownership check — the query
itself won't return or affect another user's row. `events.service.js`'s
`getOwnedOrThrow` calls `findByIdAndUserId` and throws
`ApiError.notFound()` (not `forbidden()`) when it returns nothing, so a
request for someone else's event and a request for a nonexistent event are
indistinguishable to the caller — the API never confirms that a private
event id exists.

`req.user.id` (set by `authenticate` from the verified JWT) is the only
source of the acting user's identity anywhere in this flow; no `userId` is
ever read from the request body, query string, or URL.

### Event lifecycle & deletion strategy

Events are created as `status = 'draft'`. Phase 5 made `publish`/`unpublish`
real (see below) — `status` and `event_type` were kept as `VARCHAR`, not a
MySQL `ENUM`, specifically so a later phase could add a new type or status
by editing `src/constants/eventTypes.js` / `eventStatus.js` (backend) and
their frontend mirrors, with no migration required — which is exactly what
made adding `published`/`archived` handling in Phase 5 a pure application-
layer change.

**Deletion is a single soft-delete path for every event, regardless of
status.** `DELETE /events/:id` always sets `deleted_at = NOW()`; every
repository read (`findByIdAndUserId`, `findAllByUserId`, the JOIN in
duplication) filters `deleted_at IS NULL`. The Phase 3 spec asked for
draft events to potentially hard-delete while published/archived ones are
soft-deleted — that branch was deliberately not built: since nothing in
Phase 3 can reach `published` yet (no publish flow exists), every delete
today is a draft delete, and building two code paths for a distinction
that can't currently occur would be speculative. One soft-delete path is
simpler, keeps the door open for a future "restore from trash" feature,
and never permanently destroys a row through the API.

### Template configuration safety & versioning

`template.config` is parsed defensively (`safeParseConfig` in
`utils/serializeEvent.js`): malformed JSON returns `null` rather than
throwing, and the frontend falls back to CardHub's default token palette
via CSS `color-mix()`/`var()` fallbacks whenever `colors` is missing. A
broken or incomplete template config can never crash a page.

**How the Phase 3 open question was actually resolved in Phase 4:** events
still store a live `template_id` reference, not a snapshot — no version/
snapshot mechanism was built, and this is deliberate, not an oversight.
When Phase 4 added per-event customization, it stored those overrides in
`events.invitation_config.design` (`colors`, `font`, `background`,
`coverImage`), a field that belongs to the *event*, not the template. The
renderer resolves each value independently: `config.design.colors ||
templateConfig.colors`. So:

- A customer who never touched the design panel sees the template's
  current colors — if CardHub updates that template's default palette,
  their invitation updates too, which is the *desired* behavior for an
  unmodified default, not a bug.
- A customer who picked a custom color has that exact value sitting in
  their own `invitation_config`, completely independent of the template
  row. Editing the template afterward cannot touch it — there is nothing
  to "unexpectedly break," because the override was never derived from the
  template at read-time in the first place.

This satisfies the Phase 5 spec's "ensure a template configuration change
cannot unexpectedly break an existing event" requirement without adding
snapshot/versioning machinery: the override-or-fallback layering already
provides the safety a snapshot would have, more simply.

### Slug strategy

Both templates and events have unique slugs (`event_templates.slug`,
`events.slug`). Event slugs are generated by `utils/slugify.js`'s
`uniqueSlug()`: a lowercased, hyphenated version of the title plus a
5-character random suffix (e.g. `leonard-neema-wedding-a8f32`), with a
belt-and-suspenders collision check against the database before use.
Template slugs are hand-authored in the seed file (e.g. `elegant-ivory`)
since there are only a handful, curated by CardHub, not user-generated.

As of Phase 5, the event slug **is** the public URL —
`GET /api/v1/public/invitations/:slug` and the frontend's `/invite/:slug`
both key off it, never the numeric id. Since the slug is generated once at
creation and never regenerated on update, template change, or publish, a
customer's shared link keeps working for the life of the event — publishing
does not mint a new URL.

### Reused catalog architecture (public page + wizard)

`GET /api/v1/templates` backs both the public `/templates` page and the
event creation wizard's template step — one hook
(`src/hooks/useTemplateCatalog.js`) owns the fetch/debounce/pagination/
loading-empty-error state machine, and one component
(`src/components/templates/TemplateCard.jsx`) renders a template either
way (`onPreview` for the public catalog, `onSelect`/`isSelected` for the
wizard and the "change template" modal). Neither page reimplements catalog
logic.

### How the Phase 3 extension points were actually used in Phase 4

Phase 3 reserved two possible seams for customer customization: the
`events.cover_image` / `primary_color` / `secondary_color` columns, or a
new table for free-form per-event design JSON. Phase 4 took a third,
simpler option — a single `events.invitation_config` **JSON column**
(migration 010), holding both the section content and the design overrides
together. Practically, this means the three Phase 3 placeholder columns
(`cover_image`, `primary_color`, `secondary_color`) ended up **unused** —
cover image and colors live at `invitation_config.design.coverImage` /
`.colors` instead. This was a deliberate call, not an oversight: colors are
naturally a `{primary, accent}` pair, which doesn't split cleanly across
two flat `VARCHAR` columns anyway, and keeping *all* customization
(sections *and* design) in one JSON blob means the whole "what does this
invitation look like" question has exactly one source of truth instead of
two (some columns, some JSON). A future migration can drop the three unused
columns once nothing depends on them still being reserved.

`InvitationPreview` (the Phase 2/3 marketing-page mock) still takes a
`colors` prop the way Phase 3 anticipated — but Phase 4 did not extend it
into the real invitation renderer. It remains a decorative mock for the
homepage/template-catalog only. The actual renderer is a new, separate
component (`InvitationRenderer`, next section) built specifically to be
reused identically across the builder, preview, and public page — a
requirement `InvitationPreview` was never designed to carry (it has no
concept of sections, only a single static card).

## Invitation config architecture (Phase 4)

`events.invitation_config` is a JSON column, always present (every event
gets a default config at creation — `buildDefaultInvitationConfig()`,
mirrored on the frontend for the wizard/sandbox), shaped as:

```json
{
  "version": 1,
  "sections": [
    { "id": "hero", "type": "hero", "enabled": true, "order": 0, "data": { "subtitle": "" } },
    { "id": "details", "type": "details", "enabled": true, "order": 1, "data": {} },
    { "id": "venue", "type": "venue", "enabled": true, "order": 2, "data": {} },
    { "id": "message", "type": "message", "enabled": true, "order": 3, "data": { "message": "" } },
    { "id": "hosts", "type": "hosts", "enabled": false, "order": 4, "data": { "hosts": [] } },
    { "id": "countdown", "type": "countdown", "enabled": false, "order": 5, "data": {} },
    { "id": "gallery", "type": "gallery", "enabled": false, "order": 6, "data": { "images": [] } }
  ],
  "design": {
    "colors": null,
    "font": "poppins",
    "background": { "type": "template", "value": null },
    "coverImage": null
  }
}
```

**Section model.** Exactly the 7 types in `SECTION_TYPES`
(backend `constants/invitationSections.js`, frontend mirror in
`constants/invitationSections.js`) — Phase 4 doesn't support customer-
defined section types, so `id` is constrained to equal `type` (one of each
section, no duplicates), which both simplifies validation and matches the
default config shape exactly. `enabled` and `order` control what the
renderer shows and in what sequence; a disabled section's `data` is kept,
not deleted, so re-enabling it restores prior content. The hero section's
enable toggle is disabled in the builder UI (not the backend) as a soft
guardrail, since publish requires at least one enabled section and hero is
the one every invitation should keep.

**Section content vs. event data.** `details` and `venue` sections carry no
`data` of their own — they render directly from the event's own
`eventDate`/`eventTime`/`timezone`/`venue` fields, so there is exactly one
source of truth for "when/where," editable from Event Settings, not
duplicated into the builder. `hero`, `message`, `hosts`, and `gallery`
carry section-specific content (`subtitle`, `message`, `hosts[]`,
`images[]`) that only exists in the invitation, not the event row.

**Design layering.** `design.colors`/`.font`/`.background`/`.coverImage`
are the event's overrides. The renderer resolves each independently against
the template's defaults (`config.design.colors || templateConfig.colors`),
per the versioning-safety discussion above — never a merge/snapshot, always
a live two-level fallback.

### Validator: whitelist reconstruction, not passthrough validation

`backend/src/validators/invitation.validator.js`'s
`validateAndNormalizeInvitationConfig()` does not check-then-forward the
client's JSON. It **rebuilds a brand-new object field by field**, reading
only recognized keys (`version`, each section's `id`/`type`/`enabled`/
`order`/typed `data`, `design.colors`/`.font`/`.background`/`.coverImage`)
and discarding everything else. This means an attacker cannot smuggle an
unexpected key into storage even if some future code path started trusting
it blindly — there is no code path in this validator that ever does
`{ ...clientPayload }`. Concretely: `<script>` in a text field is rejected
(any `<`/`>` in `hero.data.subtitle`, `message.data.message`, or a host
name), colors must match `^#[0-9a-fA-F]{6}$`, image URLs must be `https(s)`
with a plausible image extension (`utils/safeImageUrl.js`), fonts must be
in the `FONT_OPTIONS` allowlist, and the whole payload is rejected above
~20KB serialized (`MAX_CONFIG_BYTES`) before any of that per-field work
even runs. This was verified with a standalone script exercising 8 attack/
edge cases (XSS, unknown section type, bad hex color, `javascript:` image
URL, duplicate section, wrong version, oversized payload, and one valid
config) — see the Phase 4/5 completion report.

### The one invitation renderer

`src/components/invitation/InvitationRenderer.jsx` takes `{ event, config,
templateConfig }` and is the **only** place invitation markup is produced.
Three consumers, zero duplication:

- **Builder canvas** (`InvitationCanvasEmbed.jsx`) — renders the real
  component at a fixed 375×780 design size, then scales the whole thing
  down with CSS `transform: scale()` (factor computed by
  `useCanvasScale`, a `ResizeObserver`-driven hook) to fit whatever width
  the panel has. This is why every section's CSS deliberately avoids `vh`/
  `vw` — those units resolve against the true viewport regardless of an
  ancestor's `transform`, which would make text/spacing look wrong-sized
  once scaled down. Fixed `px`/`rem` values scale correctly under
  `transform`; responsive breakpoints use `@media (min-width: …)` on those
  fixed values instead of `clamp(…vw…)`.
- **Builder preview overlay** (`BuilderPreviewOverlay.jsx`) — the same
  component at 1:1 scale, full-screen, so "Preview" shows exactly what
  publishing would produce.
- **Public page** (`pages/public/InvitationPage.jsx`) — the same component
  again, fed by the public DTO instead of the owner DTO.

The event workspace's Overview tab also embeds it (via
`InvitationCanvasEmbed`), replacing what was a generic decorative mock in
Phase 3 — so even the dashboard's "here's your invitation" preview is the
real thing, not an approximation.

Motion: each section carries a staggered `ch-animate-fade-in` /
`ch-animate-slide-up` (existing Phase 1 animation classes) keyed off its
render index, rather than a scroll-triggered `IntersectionObserver` —
simpler, and automatically respects `prefers-reduced-motion` through the
global override already in `styles/animations.css`, with no new code
needed for that requirement.

## Publishing (Phase 5)

`POST /events/:id/publish` is a single `UPDATE events SET status =
'published', published_at = NOW() WHERE id = ? AND user_id = ? AND
deleted_at IS NULL` — atomic by virtue of being one statement touching one
table; no multi-table transaction was needed because publishing doesn't
touch `event_templates` or any other table. Before that update runs,
`assertPublishable()` (in `events.service.js`) checks: title present,
`eventDate` set, the referenced template is still `active`, and at least
one section is enabled. Any failure throws `ApiError.validation(details,
"This invitation is not ready to publish yet")` — the same field/message
shape as every other validation error, surfaced in the frontend's
`PublishModal` as a list rather than a generic toast. `unpublish` is the
mirror update (`status = 'draft', published_at = NULL`) and does not touch
`invitation_config` — nothing about the invitation's content or design is
lost by unpublishing.

### Public API data minimization

`GET /public/invitations/:slug` never touches the owner-facing
`toEventDTO`. It has its own serializer, `toPublicInvitationDTO`
(`utils/serializeEvent.js`), which is an explicit field allowlist —
`title`, `hostName`, `eventType`, `eventDate`, `eventTime`, `timezone`,
`venue`, `description`, `invitation` (the config), and `template.category`/
`.config` only. No `id`, `user_id`, `status`, `slug`, `createdAt`/
`updatedAt`/`publishedAt`, or template `id`/`status` ever leaves this
endpoint. The repository query backing it
(`eventRepository.findPublishedBySlug`) filters `status = 'published' AND
deleted_at IS NULL` in the `WHERE` clause itself — a draft or archived
event is invisible to this query, not filtered out after the fact, so
there's no code path where forgetting a check after the query would leak
one.

`publicService.getInvitationBySlug` also validates the slug's *shape*
(`^[a-z0-9-]{1,220}$`) before ever querying, and returns the identical
`404 "Invitation not found"` for a malformed slug, an unpublished event,
and a nonexistent one — the same "don't confirm what exists" principle
already used for cross-user event access in Phase 3.

`routes/v1/public.routes.js` is a separate router module from
`events.routes.js`, mounted at `/api/v1/public`, specifically so the
owner-facing event API (which will keep growing — Phase 6 guests, Phase 8
payments, etc.) can never accidentally end up reachable without
authentication through route-table drift; the public surface is small,
reviewed on its own, and physically cannot import anything that requires
`req.user`.

## Frontend layering

- **components/ui/** — dumb, reusable primitives (Button, Modal, Toast...).
  No API calls, no routing, no app-specific copy.
- **components/layout/** and **layouts/** — page chrome. `layouts/` are
  route-level wrappers (`PublicLayout`, `AuthLayout`, `DashboardLayout`)
  that `routes/AppRoutes.jsx` assigns per route group.
- **context/** + **hooks/** — `AuthContext`/`useAuth` and
  `ToastContext`/`useToast` are the only two global providers Phase 1
  establishes. Context objects live in their own `*-context.js` files
  (not the provider `.jsx`) purely so Fast Refresh can hot-reload the
  provider component without that lint rule firing.
- **services/api.js** — the single Axios instance. It attaches the stored
  access token to every request and clears the session on a 401 via a
  registered handler (`setUnauthorizedHandler`), rather than every service
  module reimplementing that.

## Design tokens

All color, spacing, radius, shadow, and motion values are CSS custom
properties defined once in `src/styles/tokens.css` and consumed by
semantic name (`--bg-primary`, `--accent`, `--shadow-md`, ...) everywhere
else — components never hardcode a hex value. The palette is Navy + Green
+ White; `src/styles/typography.css` defines the Poppins-based type scale
the same way. If the brand palette changes, it changes in one file.

## Public content vs. real data

`src/constants/pricing.js` and `faq.js` are explicitly labeled demo/config
data in their file headers — the Pricing and FAQ pages read from them
directly, since there's no `plans` table or pricing API yet (that's Phase
7's payments work). `src/constants/templates.js` is now **only** used for
the homepage's decorative template teaser section (a handful of cards,
intentionally static so the highest-traffic page doesn't need an API call
for a purely illustrative section) — the actual `/templates` catalog page
and the event wizard both fetch real data from `GET /api/v1/templates` as
of Phase 3. When Phase 8 adds real pricing/payments, `pricing.js` should
similarly be replaced by a backend-driven equivalent.

The `/contact` endpoint is real (validates, logs, and writes an
`audit_logs` row with `entity_type = 'contact_message'`) but does not send
email — there's no provider configured yet (Phase 7, communications). It's
honest about this: the success message says the team will follow up, not
that an email was sent.

## Guest management & RSVP (Phase 6)

### Guest ownership — one level deeper than events

`guests` FKs to `events.id` (`ON DELETE CASCADE`); every repository method
that touches a guest takes the guest id **and** the event id
(`findByIdAndEventId`, `updateByIdAndEventId`, `deleteByIdAndEventId`),
mirroring the `findByIdAndUserId` event pattern one level deeper.
`guests.service.js` adds a local `assertEventOwnership(userId, eventId)`
helper — every guest operation first proves the *event* belongs to
`req.user.id` (reusing the same `findByIdAndUserId` query events.service.js
already relies on) before touching a single guest row. A request for a
guest under someone else's event 404s at the event-ownership check, before
the guest table is ever queried — the same "don't confirm what exists"
principle as event/public access.

Routes are nested, not flat: `guests.routes.js` is a
`Router({ mergeParams: true })` mounted at `eventsRouter.use('/:id/guests',
guestsRouter)`, so every guest URL is physically `/events/:id/guests/...`
— there's no route shape where a guest id alone, without an event id,
could resolve to anything. Static sub-paths (`/stats`, `/bulk-delete`,
`/bulk-import`) are registered before the `/:guestId` param route to avoid
Express treating `stats` as a guest id.

### Deduplication without guest accounts

`guests` has `UNIQUE KEY (event_id, phone)`. MySQL's unique index treats
each `NULL` as distinct, so guests without a phone number are never
treated as duplicates of each other (families/plus-ones sharing a name are
fine). Bulk import uses `INSERT IGNORE` so a CSV re-upload silently skips
rows that collide with an existing phone rather than erroring the whole
batch — paired with a JSON `bulk-import` endpoint that validates every row
independently and returns `{ valid, invalid }`, so one malformed row never
blocks the rest (a deliberate partial-success philosophy, not
all-or-nothing).

### Public RSVP submission

`POST /public/invitations/:slug/rsvp` lives in `public.routes.js`, exactly
where the Phase 5 extension notes anticipated: unauthenticated, rate
limited (`rsvpLimiter`, 20/hour/IP — enough for a household responding for
several guests, low enough to blunt scripted flooding), and physically
separate from the owner-facing event API so route-table drift can never
expose it there by accident. `rsvp.service.js`'s `submit()` does a
phone-based upsert against the `guests` table (update the matching guest
if the phone matches an existing row, otherwise create one), writes an
`rsvp.submitted` audit log entry, and — Phase 7 addition — notifies the
event owner via the internal notification system. `RSVP_RESPONSE_VALUES`
intentionally excludes `pending`: a guest can submit "attending" or
"declined," never "pending" — pending is only ever the default state
before anyone has responded.

### RSVP as an invitation section

`rsvp` was added to `SECTION_TYPES` exactly the way the Phase 5 notes
predicted — its own entry in `defaultInvitationConfig.js` (enabled by
default, `order: 7`), its own component
(`components/invitation/sections/RsvpSection.jsx`), and no changes to the
renderer's core logic. The one new wrinkle: `RsvpSection` needs to know
whether it's allowed to actually submit, which the generic section props
(`event`, `data`, `index`) don't carry — so `InvitationRenderer` gained an
optional `slug` prop, threaded to every section (a no-op for sections that
ignore it). Only `InvitationPage.jsx` (the real public page) passes a real
slug; the builder canvas and preview overlay don't, so the form renders
with disabled inputs and a "RSVP form preview" note there — no risk of a
customer accidentally submitting an RSVP to their own event while editing.

## Notifications & sharing (Phase 7)

### Internal notifications, not a queue

`notifications` is a plain table (`user_id` FK CASCADE, `type`, `title`,
`message`, `data` JSON, `read_at`), not a job queue — CardHub doesn't need
retry/delivery semantics for an in-app bell icon. `notificationsService.notify(userId,
{...})` is called directly, synchronously, by whichever service produces
the event (currently only `rsvp.service.js`, after a successful
submission) — no pub/sub layer, since there is exactly one producer and
one consumer (the owning user's own notification list) today. Every read
route (`GET /notifications`, `/unread-count`, `PATCH /:id/read`, `POST
/read-all`) is `authenticate`-gated and scoped to `req.user.id` only —
there is no `:userId` param anywhere in this router, the same
`/users/me*` pattern Phase 1 established for self-service endpoints.

### Sharing is client-side only, by design

The share/WhatsApp/copy-link affordances on the event Overview page
(`handleShare`, `buildWhatsAppShareUrl`) don't call the backend at all —
`navigator.share()` (with a copy-to-clipboard fallback) and a
`wa.me/?text=` deep link both just need the invitation's already-public
URL and title, which the frontend already has. There's no
"share event" business logic to enforce server-side; the only thing
worth protecting (whether the invitation is actually published/reachable)
is already enforced by the public invitation endpoint itself.

### Provider abstraction: honest unavailability, not a fake queue

`services/providers/emailProvider.js` and `smsProvider.js` both expose
`isConfigured` (false in every environment this project has run in, since
no `SMTP_*`/`SMS_*` env vars are set) and a `send(...)` that returns `{
status: 'unavailable' }` with a server-side warning log rather than
throwing, queuing silently, or pretending to succeed. This is the same
shape `paymentProvider.js` uses in Phase 8 — one interface pattern reused
for all three external integrations, so connecting a real provider later
means filling in the body of one file per provider, not restructuring any
caller.

## Billing, plans & admin (Phase 8)

### Plans are a server-side constant, not a database table

`constants/plans.js` (`PLANS.free/pro/premium`, each with
`priceTzs` and `limits.{maxEvents, maxPublishedInvitations,
maxGuestsPerEvent}`, `-1` meaning unlimited) is hand-authored, not
seeded — there is no `plans` table. This mirrors the `pricing.js`/`faq.js`
"demo/config data" pattern from earlier phases, except these limits are
**actually enforced**, not just displayed: `plan.service.js`'s
`assertCanCreateEvent`/`assertCanPublish`/`assertCanAddGuest` are called
directly from `events.service.js` (`create`, `duplicate`, `publish`) and
`guests.service.js` (`create`, `bulkImport`) — the same services that
already do ownership checks, so a limit check is just one more assertion
in an existing call path, not a new cross-cutting layer. A disabled button
on the frontend is UX only; the real gate is these service-layer
assertions, which run regardless of what the client sent.

### Payments: abstraction present, provider absent

`billing.service.js`'s `startUpgrade(userId, planId)` always throws a
clear "Payment processing is not connected yet" error — it does not
create a fake subscription row, does not mark a payment as succeeded, and
does not silently no-op. `POST /payments/webhook` has no JWT (webhooks
authenticate via provider signature, not a user session) and currently
rejects every call, since `paymentProvider.verifyWebhookSignature()`
always returns `false` with no provider configured — this was verified
live via curl. The `subscriptions`/`payments` tables and
`subscription.repository.js` exist so `billing.service.js#getSummary` has
something real to read (falling back to the free plan / empty payment
history when a user has no subscription row), not because a payment has
ever been processed in this environment.

### Admin reuses the existing role middleware, doesn't invent a new one

`admin.routes.js` is `adminRouter.use(authenticate, authorize(ROLES.ADMIN))`
— the exact same two middlewares every other protected route already
uses, just with `ROLES.ADMIN` instead of leaving the role unconstrained.
No separate "admin session" or "admin token" concept was introduced. This
was verified live with hand-signed JWTs: no token → `401`; a valid
`customer`-role token → `403`; a valid `admin`-role token → passes the
gate (then `500` from the database being unreachable in this environment,
which is itself proof the request got *past* authorization and only
failed at the DB layer). `AdminRoute.jsx` on the frontend
(`user?.role !== 'admin'` → redirect) is explicitly documented in its own
file as UX-only — the real enforcement is the middleware above, not the
client-side redirect.

Admin write actions are deliberately narrow: user suspend/reactivate and
template activate/deactivate are the only two mutating admin actions
(and both explicitly refuse to act on another admin's account/role), and
the admin Events list is **read-only** — no admin-initiated event
deletion or edit was built, since silently mutating a customer's own
content from an admin panel is exactly the kind of destructive,
easy-to-fumble capability this project's other conventions (soft-delete
only, no bulk destructive ops) argue against without an explicit
requirement for it.

### Analytics: one counter, not a visit log

`events.view_count` is a single `UNSIGNED INT` column, incremented by
`eventRepository.incrementViewCount(event.id)` from `public.service.js`
on every successful public invitation fetch — called fire-and-forget
(`.catch(() => logger.warn(...))`) so a logging failure can never affect
or delay the actual invitation response. This was a deliberate choice
over a per-view row table: a per-visit log would grow unboundedly from
page refreshes/bot traffic and raises its own privacy questions (IP/UA
storage) that a simple aggregate counter avoids entirely, while still
answering the one question the analytics page actually needs to answer
("how many times has this been viewed"). RSVP breakdown
(`events.service.js#getAnalytics`) is computed live from
`guestRepository.getStatsByEventId` (a `GROUP BY status` query) — no
separate analytics table, since the guests table itself is already the
source of truth for RSVP counts.

## What's deliberately not here yet

QR check-in, an affiliate/referral program, and a vendor marketplace were
explicitly out of scope for Phases 1–8 — see the roadmap in the root
README. As of Phase 8, every dashboard sidebar item and event workspace
tab is real and wired to a working page; there are no remaining "Soon"
placeholders left in the primary customer flows. Payment, email, and SMS
delivery are architecturally complete but not connected to a live
provider — see [`docs/production.md`](production.md) for exactly what
that means and how to connect one.
