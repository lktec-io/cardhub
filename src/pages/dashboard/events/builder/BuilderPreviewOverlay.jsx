import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { InvitationRenderer } from '../../../../components/invitation/InvitationRenderer';

export function BuilderPreviewOverlay({ isOpen, onClose, event, config, templateConfig }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="ch-builder-preview-overlay ch-animate-fade-in">
      <button type="button" className="ch-builder-preview-overlay__close" onClick={onClose} aria-label="Close preview">
        <FiX />
      </button>
      <div className="ch-builder-preview-overlay__scroll">
        <InvitationRenderer event={event} config={config} templateConfig={templateConfig} />
      </div>
    </div>,
    document.body
  );
}
