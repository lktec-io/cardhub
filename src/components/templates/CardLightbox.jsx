import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiDownload, FiShare2, FiX } from 'react-icons/fi';
import { TemplateThumb } from './TemplateThumb';
import { formatCardPrice } from '../../constants/pricingTiers';
import { getCategoryLabel } from '../../constants/templateCategories';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Full-screen card preview. The card image gets as much of the screen as
 * possible, with name, price and actions in a compact bar under it.
 * `actions` holds page-specific CTAs (Use This Card, Buy Now, ...).
 */
export function CardLightbox({ template, onClose, onShare, onDownload, actions }) {
  const { t } = useLanguage();
  const closeRef = useRef(null);
  const isOpen = Boolean(template);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!template) return null;

  const categoryKey = `category.${template.category}`;
  const categoryLabel = t(categoryKey) === categoryKey ? getCategoryLabel(template.category) : t(categoryKey);

  return createPortal(
    <div className="ch-lightbox" role="dialog" aria-modal="true" aria-labelledby="ch-lightbox-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button ref={closeRef} type="button" className="ch-lightbox__close" onClick={onClose} aria-label={t('catalogue.close')}>
        <FiX aria-hidden="true" />
      </button>

      <div className="ch-lightbox__stage" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <TemplateThumb key={template.id} template={template} className="ch-lightbox__image" />
      </div>

      <div className="ch-lightbox__bar">
        <div className="ch-lightbox__info">
          <p className="ch-lightbox__category">{categoryLabel}</p>
          <h2 className="ch-lightbox__title" id="ch-lightbox-title">
            {template.name}
          </h2>
          {typeof template.priceTzs === 'number' && <p className="ch-lightbox__price">{formatCardPrice(template.priceTzs)}</p>}
        </div>
        <div className="ch-lightbox__actions">
          <button type="button" className="ch-lightbox__tool" onClick={() => onShare(template)}>
            <FiShare2 aria-hidden="true" />
            {t('catalogue.share')}
          </button>
          <button type="button" className="ch-lightbox__tool" onClick={() => onDownload(template)}>
            <FiDownload aria-hidden="true" />
            {t('catalogue.download')}
          </button>
          {actions}
        </div>
      </div>
    </div>,
    document.body
  );
}
