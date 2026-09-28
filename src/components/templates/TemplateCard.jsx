import { FiCheck, FiDownload, FiEye, FiShare2 } from 'react-icons/fi';
import { GlassCard, Badge, Button } from '../ui';
import { TemplateThumb } from './TemplateThumb';
import { getCategoryLabel } from '../../constants/templateCategories';
import { formatCardPrice } from '../../constants/pricingTiers';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Passing `onShare`/`onDownload` switches the card to gallery mode: the
 * image opens the preview, and a compact View · Share · Download row
 * replaces the separate Preview button. Callers that pass neither (the
 * event wizard, the change-template modal) render exactly as before.
 */
export function TemplateCard({ template, onPreview, onSelect, onUse, onBuy, onShare, onDownload, isSelected = false }) {
  const galleryMode = Boolean(onShare || onDownload);
  const showPreviewButton = Boolean(onPreview) && !galleryMode;
  const hasSecondaryAction = showPreviewButton || Boolean(onSelect);
  const { t } = useLanguage();
  const categoryLabel = t(`category.${template.category}`) === `category.${template.category}`
    ? getCategoryLabel(template.category)
    : t(`category.${template.category}`);

  const thumb = (
    <TemplateThumb template={template} className="ch-template-card__swatch">
      {isSelected && (
        <span className="ch-template-card__selected-badge">
          <FiCheck aria-hidden="true" />
        </span>
      )}
    </TemplateThumb>
  );

  return (
    <GlassCard
      hoverable
      className={`ch-template-card ${galleryMode ? 'ch-template-card--gallery' : ''} ${isSelected ? 'ch-template-card--selected' : ''}`}
    >
      {galleryMode && onPreview ? (
        <button type="button" className="ch-template-card__media-btn" onClick={() => onPreview(template)} aria-label={`${t('catalogue.view')}: ${template.name}`}>
          {thumb}
        </button>
      ) : (
        thumb
      )}
      <Badge variant="default">{categoryLabel}</Badge>
      <h3 className="ch-h4">{template.name}</h3>
      {template.description && <p className="ch-body-sm">{template.description}</p>}
      {typeof template.priceTzs === 'number' && (
        <p className="ch-template-card__price">{formatCardPrice(template.priceTzs)}</p>
      )}

      {galleryMode && (
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
      )}

      {(showPreviewButton || onSelect || onUse || onBuy) && (
        <div className="ch-template-card__actions">
          {showPreviewButton && (
            <Button variant="outline" size="sm" fullWidth={!onSelect && !onUse} onClick={() => onPreview(template)}>
              {t('catalogue.preview')}
            </Button>
          )}
          {onSelect && (
            <Button
              variant={isSelected ? 'primary' : 'secondary'}
              size="sm"
              fullWidth={!showPreviewButton && !onUse}
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
      )}
    </GlassCard>
  );
}
