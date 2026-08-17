import { InvitationCanvasEmbed } from '../../../../components/invitation/InvitationCanvasEmbed';

export function BuilderCanvas({ event, config, templateConfig }) {
  return (
    <div className="ch-builder__canvas-wrap">
      <InvitationCanvasEmbed event={event} config={config} templateConfig={templateConfig} />
    </div>
  );
}
