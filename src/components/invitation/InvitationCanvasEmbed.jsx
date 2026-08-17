import { useRef } from 'react';
import { InvitationRenderer } from './InvitationRenderer';
import { useCanvasScale } from '../../hooks/useCanvasScale';

const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 780;

/** Embeds the real InvitationRenderer at a fixed "phone" size, scaled via
 * CSS transform to fit whatever container it's placed in — used by the
 * builder canvas and the event workspace overview, so both show the exact
 * same rendering the public page will. */
export function InvitationCanvasEmbed({ event, config, templateConfig, height = DESIGN_HEIGHT }) {
  const containerRef = useRef(null);
  const scale = useCanvasScale(containerRef, DESIGN_WIDTH);

  return (
    <div className="ch-builder-canvas" ref={containerRef}>
      <div
        className="ch-builder-canvas__frame"
        style={{ width: DESIGN_WIDTH, height, transform: `scale(${scale})` }}
      >
        <div className="ch-builder-canvas__scroll">
          <InvitationRenderer event={event} config={config} templateConfig={templateConfig} />
        </div>
      </div>
    </div>
  );
}
