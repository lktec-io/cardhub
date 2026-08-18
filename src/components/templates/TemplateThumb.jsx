import { useState } from 'react';
import { FiSmartphone } from 'react-icons/fi';
import { getLocalCatalogueImagePath } from '../../utils/templateImage';

/**
 * Single source of truth for rendering a template's preview image —
 * used by the catalogue, Try Our Service, the landing page's catalogue
 * preview, the event-creation wizard's template step, and the "change
 * template" modal (all via TemplateCard, which renders this).
 *
 * Image resolution is a priority chain, each step only attempted if the
 * previous one is missing or fails to load:
 *   1. template.previewImage — a backend-supplied image (e.g. a future
 *      Cloudinary-hosted upload). Not set for today's built-in catalogue
 *      templates, whose images are frontend-owned, not backend-managed.
 *   2. /cards/{template.slug}.jpg — the frontend's own built-in catalogue
 *      asset (see public/cards/README.md). This is what actually renders
 *      for every template today, since previewImage is null for all of
 *      them by design.
 *   3. The existing CSS-gradient + icon placeholder — only once both of
 *      the above are absent or have failed. Never a broken-image icon.
 *
 * The onError handler only ever moves forward through this chain
 * (remote -> local -> none), so a failing image can't loop.
 */
function firstImageCandidate(template) {
  if (template.previewImage) {
    return { stage: 'remote', src: template.previewImage };
  }
  const localPath = getLocalCatalogueImagePath(template.slug);
  return localPath ? { stage: 'local', src: localPath } : { stage: 'none', src: null };
}

export function TemplateThumb({ template, className, children }) {
  const [candidate, setCandidate] = useState(() => firstImageCandidate(template));
  const colors = template.config?.colors;
  const fallbackStyle = colors ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : undefined;
  const showImage = candidate.stage !== 'none';

  function handleImageError() {
    setCandidate((current) => {
      if (current.stage === 'remote') {
        const localPath = getLocalCatalogueImagePath(template.slug);
        return localPath ? { stage: 'local', src: localPath } : { stage: 'none', src: null };
      }
      return { stage: 'none', src: null };
    });
  }

  return (
    <div className={className} style={showImage ? undefined : fallbackStyle}>
      {showImage ? (
        <img src={candidate.src} alt={template.name} onError={handleImageError} />
      ) : (
        <FiSmartphone aria-hidden="true" />
      )}
      {children}
    </div>
  );
}
