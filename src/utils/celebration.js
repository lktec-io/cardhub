import confetti from 'canvas-confetti';

/**
 * CardHub palette — modern, vivid greens as the dominant accent (matching
 * the brand's --color-green-* tokens exactly), combined tastefully with
 * champagne/gold, white, soft blush, and a touch of lavender. Deliberately
 * not the default canvas-confetti rainbow, so the effect reads as a
 * premium event celebration rather than a generic web-game explosion —
 * green is just weighted heaviest in the mix, not the only color.
 */
const GREEN = ['#22c55e', '#16a34a', '#34d399', '#22c55e', '#34d399'];
const GOLD = ['#d4af37', '#f5e6a3', '#ffd700', '#e8c84a'];
const WHITE = ['#ffffff', '#fffef0', '#f5f5f5'];
const BLUSH = ['#ffd1dc', '#f8bbd0', '#ff8fab'];
const LAVENDER = ['#e8d5f5', '#d1c4e9'];
const PALETTE = [...GREEN, ...GREEN, ...GOLD, ...WHITE, ...BLUSH, ...LAVENDER];

let confettiFire = null;

/**
 * A dedicated canvas appended straight to document.body — not nested
 * anywhere in the app's own DOM tree — so it can never be clipped by an
 * ancestor's overflow:hidden, shrunk by a transform, dimmed by a filter,
 * or buried under another element's z-index (the exact failure modes of
 * mounting a confetti canvas inside a card/component). Created once and
 * reused for the lifetime of the page.
 */
function getConfettiFire() {
  if (confettiFire) return confettiFire;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '2147483000',
  });
  document.body.appendChild(canvas);

  confettiFire = confetti.create(canvas, { resize: true, useWorker: true });
  return confettiFire;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

const SHAPES = ['square', 'circle'];

/**
 * A rich, full-coverage sequence of coordinated bursts — a genuine
 * celebration, not a token sprinkle. Particles are deliberately large
 * (scalar well above canvas-confetti's default of 1) so nothing reads as
 * dust. Skipped entirely under prefers-reduced-motion, same rule as every
 * other animation in the app.
 */
export function celebrateWithConfetti() {
  if (prefersReducedMotion()) return;
  const fire = getConfettiFire();
  if (!fire) return;

  // 1. Large center burst
  fire({
    particleCount: 130, spread: 100, startVelocity: 42, gravity: 1, scalar: 1.25, ticks: 260,
    origin: { x: 0.5, y: 0.55 }, colors: PALETTE, shapes: SHAPES,
  });

  // 2. Left cannon + right cannon
  setTimeout(() => {
    fire({ particleCount: 60, angle: 60, spread: 65, startVelocity: 48, scalar: 1.15, origin: { x: 0.03, y: 0.65 }, colors: PALETTE, shapes: SHAPES });
    fire({ particleCount: 60, angle: 120, spread: 65, startVelocity: 48, scalar: 1.15, origin: { x: 0.97, y: 0.65 }, colors: PALETTE, shapes: SHAPES });
  }, 220);

  // 3. Falling celebration shower
  setTimeout(() => {
    fire({
      particleCount: 90, spread: 130, startVelocity: 20, gravity: 0.6, scalar: 1.1, ticks: 400,
      origin: { x: 0.5, y: 0.02 }, colors: PALETTE, shapes: SHAPES,
    });
  }, 480);

  // 4. Final wide burst
  setTimeout(() => {
    fire({
      particleCount: 110, spread: 150, startVelocity: 34, gravity: 0.9, scalar: 1.3,
      origin: { x: 0.5, y: 0.5 }, colors: PALETTE, shapes: SHAPES,
    });
  }, 780);

  // 5. Lingering particles
  setTimeout(() => {
    fire({
      particleCount: 45, spread: 150, startVelocity: 12, gravity: 0.35, scalar: 1.05, ticks: 460,
      origin: { x: 0.5, y: 0.3 }, colors: PALETTE, shapes: SHAPES,
    });
  }, 1080);
}

/**
 * A soft C5 → E5 → G5 chime, synthesized directly via the Web Audio API
 * (no audio file to ship/host). Must be called from within a genuine
 * user-interaction call chain — browsers block unprompted audio, and
 * this deliberately makes no attempt to work around that. Wrapped so a
 * blocked/unsupported AudioContext can never throw into the caller's
 * success flow.
 */
export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((frequency, i) => {
      const startAt = ctx.currentTime + i * 0.15;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.11, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.5);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.55);
    });

    setTimeout(() => ctx.close?.().catch(() => {}), 900);
  } catch {
    // Autoplay policy, unsupported browser, etc. — a missing chime must never break the success flow it's decorating.
  }
}

/** The single entry point call sites should use — confetti + chime together, one user-triggered celebration moment. */
export function celebrateSuccess() {
  celebrateWithConfetti();
  playSuccessChime();
}
