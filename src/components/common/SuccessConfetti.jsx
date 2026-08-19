import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const COLORS = ['var(--color-royal-500)', 'var(--color-gold-500)', 'var(--color-gold-300)', '#ffffff'];
const PIECE_COUNT = 20;
const LIFETIME_MS = 1700;

/**
 * A short, restrained confetti burst for the Try Our Service success
 * moment — pure CSS keyframes, no canvas/animation library. Absolutely
 * positioned within its own bounded, overflow-hidden container (not
 * viewport-fixed), so it can never block scrolling or intercept taps —
 * `pointer-events: none` on every piece too. Unmounts itself after one
 * run rather than looping. Renders nothing at all under
 * prefers-reduced-motion, per the standing rule used elsewhere
 * (RotatingHeadline / useReducedMotion) — a static success state is a
 * complete, correct experience on its own.
 */
export function SuccessConfetti() {
  const reducedMotion = useReducedMotion();
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = setTimeout(() => setIsDone(true), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // Lazy useState initializer, not useMemo — this is the one React-
  // sanctioned place to call an impure function (Math.random) during
  // render, since it's guaranteed to run exactly once per mount.
  const [pieces] = useState(() =>
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 100),
      delay: Math.round(Math.random() * 220),
      duration: 900 + Math.round(Math.random() * 500),
      rotate: Math.round(Math.random() * 360),
      drift: Math.round((Math.random() - 0.5) * 60),
      color: COLORS[i % COLORS.length],
      isRound: i % 3 === 0,
    }))
  );

  if (reducedMotion || isDone) return null;

  return (
    <div className="ch-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`ch-confetti__piece ${p.isRound ? 'ch-confetti__piece--round' : ''}`}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            background: p.color,
            '--ch-confetti-drift': `${p.drift}px`,
            '--ch-confetti-rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
