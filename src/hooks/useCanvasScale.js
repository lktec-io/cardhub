import { useEffect, useState } from 'react';

/** Computes the scale factor to fit a fixed-width design (e.g. a 375px
 * "phone") inside a container of unknown, resizable width. Used to render
 * the real InvitationRenderer markup at full fidelity and just shrink it
 * visually, rather than maintaining a second "compact" render path. */
export function useCanvasScale(containerRef, designWidth) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(Math.min(1, width / designWidth));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, designWidth]);

  return scale;
}
