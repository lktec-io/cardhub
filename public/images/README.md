# Marketing images

Drop real marketing photography here. Vite serves everything in
`public/` from the site root, so a file placed at

```
public/images/hero-couple.jpg
```

is reachable at `/images/hero-couple.jpg` — exactly the path the landing
page hero (`src/pages/LandingPage.jsx`) already references.

## Needed now: `hero-couple.jpg`

**This file does not exist yet.** The landing page hero is built to use
a real, high-quality photo of a couple/celebration as its main visual —
per explicit instruction, no AI-generated image, no scraped/reference
image, and no random remote URL was used to fill the gap. Until a real
file is dropped in at this path, the `<img>` fails to load and its
`onError` handler swaps in a soft royal-blue-to-gold gradient
(`.ch-hero__photo--fallback` in `src/pages/pages.css`) instead of a
broken-image icon — a graceful placeholder, not a fake photo.

**To finish this**: supply a real photo (an engagement/wedding/couple
photo Clix Digital Works has the rights to use) at
`public/images/hero-couple.jpg` and the hero will pick it up
automatically — no code change needed.

### Format guidance

- Portrait orientation works best — the hero box is `aspect-ratio: 4/5`
  on desktop and `1/1` on mobile, both with `object-fit: cover`, so the
  image gets cropped to fit either shape.
- `object-position` is set to `center 28%` (desktop) / `center 22%`
  (mobile) to keep faces near the top of the frame in view after
  cropping — adjust these values in `pages.css` if the actual photo's
  focal point sits elsewhere.
- A reasonably compressed JPEG or WEBP (under ~300KB) keeps the hero fast
  — it loads eager/high-priority since it's the first thing visitors see.
