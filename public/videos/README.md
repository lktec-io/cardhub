# Hero background video

Drop the real hero video here. Vite serves everything in `public/` from
the site root, so a file placed at

```
public/videos/cardhub-hero.mp4
```

is reachable at `/videos/cardhub-hero.mp4` — exactly the path the
landing page hero (`src/pages/LandingPage.jsx`, `HERO_VIDEO_SRC`)
already references.

## Needed now: `cardhub-hero.mp4`

**This file does not exist yet.** No video was generated or downloaded
to fill the gap, per explicit instruction. The hero is already fully
wired to use d in — no code change needed:

- Renders as a full-bleed background behind the hero text/photo, muted,
  autoplaying, looping, `playsInline` (so it plays inline on iOS instead
  of forcing fullscreen), no visible controls.
- A soft overlay gradient (`.ch-hero__video-overlay`) sits between the
  video and the text so "Now serving Tanzania" / "CardHub" / the
  rotating headline stay readable regardless of the footage.
- Absolutely positioned (`position: absolute; inset: 0`), so it never
  affects layout — no shift when it loads in.
- If the file is missing (today) or fails to load, the `<video>`'s
  `onError` handler removes it entirely and the existing
  `--gradient-hero` background shows through instead — the hero never
  breaks or shows a broken-media icon.
- Skipped entirely under `prefers-reduced-motion: reduce` (checked via
  `useReducedMotion`) — the static gradient background is used instead,
  no autoplaying video at all for visitors who've asked for less motion.

## Format guidance

- **Muted, short, seamlessly loopable** — a few seconds of subtle motion
  (soft camera pan, ambient celebration footage) works far better than
  anything with a hard cut, since it loops continuously.
- **MP4 (H.264)** is the safest single format for autoplay support
  across mobile Safari/Chrome/Firefox.
- Keep the file small (a few MB at most) — it loads on every landing
  page visit. Compress and trim before dropping it in.
- Any aspect ratio works — `object-fit: cover` crops it to fill the hero
  section on every screen size, the same way the couple photo does.
