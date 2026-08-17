# Feature modules

This folder is reserved for self-contained feature modules added in later
CardHub phases (`event`, `invitation`, `guest`, `rsvp`, `notification`,
`payment`, `affiliate`, etc.). Each module will bundle its own controller,
service, repository, and validator alongside the shared layers in
`controllers/`, `services/`, `repositories/`, and `validators/`.

Nothing is implemented here yet — Phase 1 only reserves the route paths in
`routes/v1/`.
