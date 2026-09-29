import { FiCheck, FiDownload, FiEye, FiMaximize2, FiShare2 } from 'react-icons/fi';
import { GlassCard, Badge, Button } from '../ui';
import { TemplateThumb } from './TemplateThumb';
import { getCategoryLabel } from '../../constants/templateCategories';
import { formatCardPrice } from '../../constants/pricingTiers';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Passing `onShare`/`onDownload` switches the card to gallery mode: a
 * full-bleed image that opens the preview, a compact body, and a
 * View · Share · Download footer (+ Buy Now when `onBuy` is given). Used
 * by the landing showcase and the public catalogue. Callers that pass
 * neither (the event wizard, the change-template modal) render exactly
 * as before.
 */
export function TemplateCard({ template, onPreview, onSelect, onUse, onBuy, onShare, onDownload, isSelected = false }) {
  const galleryMode = Boolean(onShare || onDownload);
  const { t } = useLanguage();
  const categoryLabel = t(`category.${template.category}`) === `category.${template.category}`
    ? getCategoryLabel(template.category)
    : t(`category.${template.category}`);

  if (galleryMode) {
    return (
      <article className="ch-gallery-card">
        {onPreview ? (
          <button
            type="button"
            className="ch-gallery-card__media"
            onClick={() => onPreview(template)}
            aria-label={`${t('catalogue.view')}: ${template.name}`}
          >
            <TemplateThumb template={template} className="ch-gallery-card__image" />
            <span className="ch-gallery-card__zoom" aria-hidden="true">
              <FiMaximize2 />
            </span>
          </button>
        ) : (
          <div className="ch-gallery-card__media">
            <TemplateThumb template={template} className="ch-gallery-card__image" />
          </div>
        )}

        <div className="ch-gallery-card__body">
          <div className="ch-gallery-card__meta">
            <span className="ch-gallery-card__badge">{categoryLabel}</span>
            {typeof template.priceTzs === 'number' && <span className="ch-gallery-card__price">{formatCardPrice(template.priceTzs)}</span>}
          </div>
          <h3 className="ch-gallery-card__title">{template.name}</h3>
          {template.description && <p className="ch-gallery-card__description">{template.description}</p>}
        </div>

        <div className="ch-gallery-card__footer">
          <div className="ch-card-tools">
            {onPreview && (
              <button type="button" className="ch-card-tool" onClick={() => onPreview(template)}>
                <FiEye aria-hidden="true" />
                <span>{t('catalogue.view')}</span>
              </button>
            )}
            {onShare && (
              <button type="button" className="ch-card-tool" onClick={() => onShare(template)}>
                <FiShare2 aria-hidden="true" />
                <span>{t('catalogue.share')}</span>
              </button>
            )}
            {onDownload && (
              <button type="button" className="ch-card-tool" onClick={() => onDownload(template)}>
                <FiDownload aria-hidden="true" />
                <span>{t('catalogue.download')}</span>
              </button>
            )}
          </div>
          {onBuy && (
            <Button variant="conversion" size="sm" fullWidth onClick={() => onBuy(template)}>
              {t('catalogue.buyNow')}
            </Button>
          )}
        </div>
      </article>
    );
  }

  const hasSecondaryAction = Boolean(onPreview) || Boolean(onSelect);

  return (
    <GlassCard
      hoverable
      className={`ch-template-card ${isSelected ? 'ch-template-card--selected' : ''}`}
    >
      <TemplateThumb template={template} className="ch-template-card__swatch">
        {isSelected && (
          <span className="ch-template-card__selected-badge">
            <FiCheck aria-hidden="true" />
          </span>
        )}
      </TemplateThumb>
      <Badge variant="default">{categoryLabel}</Badge>
      <h3 className="ch-h4">{template.name}</h3>
      {template.description && <p className="ch-body-sm">{template.description}</p>}
      {typeof template.priceTzs === 'number' && (
        <p className="ch-template-card__price">{formatCardPrice(template.priceTzs)}</p>
      )}
      <div className="ch-template-card__actions">
        {onPreview && (
          <Button variant="outline" size="sm" fullWidth={!onSelect && !onUse} onClick={() => onPreview(template)}>
            {t('catalogue.preview')}
          </Button>
        )}
        {onSelect && (
          <Button
            variant={isSelected ? 'brand' : 'secondary'}
            size="sm"
            fullWidth={!onPreview && !onUse}
            onClick={() => onSelect(template)}
          >
            {isSelected ? t('catalogue.selected') : t('catalogue.select')}
          </Button>
        )}
        {onUse && (
          <Button variant="primary" size="sm" fullWidth={!hasSecondaryAction} onClick={() => onUse(template)}>
            {t('catalogue.useThisCard')}
          </Button>
        )}
        {onBuy && (
          <Button variant="primary" size="sm" fullWidth={!hasSecondaryAction && !onUse} onClick={() => onBuy(template)}>
            {t('catalogue.buyNow')}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
