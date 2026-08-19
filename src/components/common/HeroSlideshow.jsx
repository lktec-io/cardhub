import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Slide 1 is the real, already-supplied hero photo — this always stays
 * on disk regardless of what slides 2/3 become. Slides 2/3 are meant to
 * be swapped freely: replace public/hero/hero-2.jpg / hero-3.jpg with a
 * new file at the same path and the slideshow picks it up automatically,
 * no code change needed. See public/hero/README.md.
 */
const SLIDES = [{ src: '/hero/hero-1.jpg' }, { src: '/hero/hero-2.jpg' }, { src: '/hero/hero-3.jpg' }];
const SLIDE_DURATION_MS = 5500;

/**
 * Premium hero background slideshow — a slow crossfade + subtle Ken
 * Burns drift between 3 stacked photos, not a generic carousel (no
 * arrows, no swipe library, no layout-shifting slide-in). All 3 images
 * render into the DOM immediately (opacity-controlled, not
 * conditionally mounted), which both preloads them and keeps every
 * transition a pure CSS opacity/transform change — nothing ever
 * reflows the page. Any slide whose file 404s quietly falls back to
 * showing slide 1's photo instead of a broken-image icon; if slide 1
 * itself is missing, every slide hides and the existing gradient
 * fallback (.ch-hero__photo--fallback, applied by the parent) shows
 * through exactly as it did before this component existed.
 */
export function HeroSlideshow({ alt, onAllFailed }) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState(() => new Set());

  useEffect(() => {
    if (reducedMotion || SLIDES.length < 2) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const primaryFailed = failedIndices.has(0);

  useEffect(() => {
    if (primaryFailed) onAllFailed?.();
  }, [primaryFailed, onAllFailed]);

  function handleError(index) {
    setFailedIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  if (primaryFailed) return null;

  return (
    <>
      {SLIDES.map((slide, index) => {
        const isActive = index === activeIndex;
        const src = failedIndices.has(index) ? SLIDES[0].src : slide.src;
        return (
          <img
            key={slide.src}
            src={src}
            alt={isActive ? alt : ''}
            aria-hidden={!isActive}
            className={`ch-hero__photo-img ch-hero-slideshow__slide ${isActive ? 'ch-hero-slideshow__slide--active' : ''} ${
              isActive && !reducedMotion ? 'ch-hero-slideshow__slide--kenburns' : ''
            }`}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => handleError(index)}
          />
        );
      })}

      {SLIDES.length > 1 && (
        <div className="ch-hero-slideshow__dots" role="tablist" aria-label="Hero image slides">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Slide ${index + 1}`}
              className={`ch-hero-slideshow__dot ${index === activeIndex ? 'ch-hero-slideshow__dot--active' : ''}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </>
  );
}
