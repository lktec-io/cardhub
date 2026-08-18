import { useState } from 'react';
import { FiSmartphone } from 'react-icons/fi';

/**
 * Real, manually-supplied catalogue image (public/cards/*, wired through
 * event_templates.preview_image) with a graceful fallback to the existing
 * CSS-gradient + icon placeholder — used by the catalogue, Try Our
 * Service, and the landing page's catalogue preview, so there's exactly
 * one place this fallback behavior lives. Never a broken-image icon: a
 * missing file (before the real design assets are dropped into
 * public/cards/) falls back automatically via onError.
 */
export function TemplateThumb({ template, className, children }) {
  const [imageFailed, setImageFailed] = useState(false);
  const colors = template.config?.colors;
  const showImage = Boolean(template.previewImage) && !imageFailed;
  const fallbackStyle = colors ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : undefined;

  return (
    <div className={className} style={showImage ? undefined : fallbackStyle}>
      {showImage ? (
        <img src={template.previewImage} alt={template.name} onError={() => setImageFailed(true)} />
      ) : (
        <FiSmartphone aria-hidden="true" />
      )}
      {children}
    </div>
  );
}
