import confetti from 'canvas-confetti';

/**
 * Romantic/premium palette, exactly as supplied — deliberately not the
 * default canvas-confetti rainbow, so the effect reads as an elegant
 * event celebration rather than a generic web-game explosion.
 */
const GOLD = ['#d4af37', '#f5e6a3', '#ffd700', '#b8942a', '#e8c84a'];
const BLUSH = ['#ffd1dc', '#f8bbd0', '#fce4ec', '#f48fb1', '#ff8fab'];
const WHITE = ['#ffffff', '#fffef0', '#f5f5f5', '#fefefe'];
const LAVENDER = ['#e8d5f5', '#d1c4e9', '#ede7f6', '#ba68c8'];
const PALETTE = [...GOLD, ...BLUSH, ...WHITE, ...LAVENDER];

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

/**
 * A short, restrained sequence of gentle bursts — never one aggressive
 * cannon blast. Skipped entirely under prefers-reduced-motion, same rule
 * as every other animation in the app.
 */
export function celebrateWithConfetti() {
  if (prefersReducedMotion()) return;
  const fire = getConfettiFire();
  if (!fire) return;

  // 1. Elegant central burst
  fire({ particleCount: 55, spread: 68, startVelocity: 30, gravity: 1, scalar: 0.9, ticks: 220, origin: { x: 0.5, y: 0.55 }, colors: PALETTE });

  // 2. Left/right romantic cannons
  setTimeout(() => {
    fire({ particleCount: 24, angle: 60, spread: 55, startVelocity: 38, origin: { x: 0.05, y: 0.65 }, colors: PALETTE });
    fire({ particleCount: 24, angle: 120, spread: 55, startVelocity: 38, origin: { x: 0.95, y: 0.65 }, colors: PALETTE });
  }, 220);

  // 3. Soft falling shower
  setTimeout(() => {
    fire({ particleCount: 36, spread: 100, startVelocity: 16, gravity: 0.55, scalar: 0.8, ticks: 320, origin: { x: 0.5, y: 0 }, colors: PALETTE });
  }, 480);

  // 4. Elegant finale
  setTimeout(() => {
    fire({ particleCount: 40, spread: 85, startVelocity: 26, gravity: 0.9, scalar: 1, origin: { x: 0.5, y: 0.5 }, colors: PALETTE });
  }, 780);

  // 5. Lingering particles
  setTimeout(() => {
    fire({ particleCount: 16, spread: 120, startVelocity: 9, gravity: 0.35, scalar: 0.7, ticks: 420, origin: { x: 0.5, y: 0.3 }, colors: PALETTE });
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
