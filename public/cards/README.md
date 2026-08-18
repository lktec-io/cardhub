# Catalogue card images

Drop real card-design image files here. Vite serves everything in
`public/` from the site root, so a file placed at

```
public/cards/elegant-ivory.jpg
```

is reachable at `/cards/elegant-ivory.jpg` — exactly the path the seed
data (`backend/src/database/seeds/002_event_templates.seed.js`) already
stores in each template's `previewImage` field.

## Expected filenames (match the current seed data)

| Template        | Expected file                    |
| ---------------- | --------------------------------- |
| Elegant Ivory     | `elegant-ivory.jpg`               |
| Midnight Romance  | `midnight-romance.jpg`            |
| Garden Bloom      | `garden-bloom.jpg`                |
| Modern Minimal    | `modern-minimal.jpg`              |
| Royal Celebration | `royal-celebration.jpg`           |
| Classic Gold      | `classic-gold.jpg`                |
| Ascend            | `ascend.jpg`                      |
| Pulse             | `pulse.jpg`                       |

No image files are committed here — this directory intentionally starts
empty (just this README) since CardHub does not generate, fake, or pull
random remote images for the catalogue. Until a real file exists at one
of the paths above, that card's `TemplateCard` renders its existing
CSS-gradient + icon placeholder (see `src/components/templates/TemplateCard.jsx`)
instead of a broken `<img>` — never a fake or placeholder photo.

## Using a different filename or path

The filename isn't hardcoded anywhere except the seed data. To use a
different name (or add a brand-new card design), just:

1. Drop the image anywhere under `public/cards/`.
2. Point that template's `previewImage` field at the matching `/cards/...`
   path — either by editing the seed file and re-running `npm run seed`,
   or, once admin template editing grows beyond the pricing-tier-only
   foundation built in Phase 9, from the admin UI directly.

## Format guidance

JPEG or WEBP, ideally close to the card's real aspect ratio (portrait,
similar to a printed card). No format validation is enforced on this
field today — it's system/admin-managed seed data, not user input — but
keep files reasonably sized for fast catalogue loading.
