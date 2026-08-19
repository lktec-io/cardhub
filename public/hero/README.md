# Hero slideshow images

The landing page hero (`src/pages/LandingPage.jsx`, rendered via
`src/components/common/HeroSlideshow.jsx`) cycles through three real
photos at this fixed path:

```
public/hero/hero-1.jpg   (slide 1)
public/hero/hero-2.jpg   (slide 2)
public/hero/hero-3.jpg   (slide 3)
```

Vite serves everything in `public/` from the site root, so these are
reachable at `/hero/hero-1.jpg`, `/hero/hero-2.jpg`, `/hero/hero-3.jpg`.

## Current state

All three files already exist and are real CardHub wedding photography
(copied from the photos already supplied in `public/images/` — nothing
here was generated or sourced from a URL):

- `hero-1.jpg` — the original hero photo (unchanged from before this
  slideshow existed).
- `hero-2.jpg` / `hero-3.jpg` — two more real photos from the same set.

## Replacing a slide later

To swap any slide for a new photo, just overwrite the file at the same
path (e.g. replace `public/hero/hero-2.jpg`) — no code change needed.
The slideshow always reads from these three fixed filenames.

### Format guidance

- Same crop behavior as the original hero photo: `object-fit: cover`
  inside a box that's `aspect-ratio: 4/5` on desktop and `1/1` on
  mobile, so portrait-oriented photos with the subject roughly centered
  crop the most predictably.
- Keep each file reasonably compressed (under ~300KB) — all three
  preload together on page load.

### If a file goes missing

- If `hero-2.jpg` or `hero-3.jpg` is deleted or fails to load, that
  slide quietly reuses `hero-1.jpg`'s photo instead of showing a
  broken-image icon.
- If `hero-1.jpg` itself is ever missing, the slideshow hides entirely
  and the hero falls back to its original soft royal-blue-to-gold
  gradient (`.ch-hero__photo--fallback`) — the same fallback that
  existed before the slideshow was added.
