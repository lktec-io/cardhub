import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const TYPE_SPEED_MS = 32;
const HOLD_MS = 1900;
const LEAVE_MS = 380;

/**
 * Elegant rotating headline: types a message on, holds it, fades/slides it
 * out, then types the next one in — repeating through `messages`. Renders
 * a fully static first message (no interval, no phase state) when
 * prefers-reduced-motion is set, per accessibility requirements. The
 * wrapping element reserves a fixed min-height (see .ch-rotating-headline
 * in pages.css) so no message length ever shifts surrounding layout.
 */
export function RotatingHeadline({ messages, as: Tag = 'p', className = '' }) {
  const reducedMotion = useReducedMotion();
  const [messageIndex, setMessageIndex] = useState(0);
  const [charCount, setCharCount] = useState(reducedMotion ? messages[0].length : 0);
  const [phase, setPhase] = useState('typing'); // typing | holding | leaving
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const currentMessage = messages[messageIndex];

    if (phase === 'typing') {
      if (charCount < currentMessage.length) {
        timeoutRef.current = setTimeout(() => setCharCount((c) => c + 1), TYPE_SPEED_MS);
      } else {
        timeoutRef.current = setTimeout(() => setPhase('holding'), HOLD_MS);
      }
    } else if (phase === 'holding') {
      timeoutRef.current = setTimeout(() => setPhase('leaving'), 10);
    } else if (phase === 'leaving') {
      timeoutRef.current = setTimeout(() => {
        setMessageIndex((i) => (i + 1) % messages.length);
        setCharCount(0);
        setPhase('typing');
      }, LEAVE_MS);
    }

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, charCount, messageIndex, reducedMotion]);

  if (reducedMotion) {
    return (
      <Tag className={className}>
        <span className="ch-rotating-headline__text">{messages[0]}</span>
      </Tag>
    );
  }

  const currentMessage = messages[messageIndex];
  const visibleText = currentMessage.slice(0, charCount);

  return (
    <Tag className={`${className} ch-rotating-headline`}>
      <span
        key={messageIndex}
        aria-hidden="true"
        className={`ch-rotating-headline__text ${phase === 'leaving' ? 'ch-rotating-headline__text--leaving' : ''}`}
      >
        {visibleText}
        {phase === 'typing' && <span className="ch-rotating-headline__caret" />}
      </span>
      <span className="ch-visually-hidden">{currentMessage}</span>
    </Tag>
  );
}
