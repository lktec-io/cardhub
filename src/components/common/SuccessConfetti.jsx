import { useEffect } from 'react';
import { celebrateSuccess } from '../../utils/celebration';

/**
 * Mount this once, right when a success state first renders (i.e. still
 * within the call chain of the user's own submit/confirm click) — it
 * fires the canvas-confetti burst sequence plus the success chime from
 * utils/celebration.js. Renders nothing itself; the confetti canvas
 * lives on document.body, not here (see celebration.js for why).
 */
export function SuccessConfetti() {
  useEffect(() => {
    celebrateSuccess();
  }, []);

  return null;
}
