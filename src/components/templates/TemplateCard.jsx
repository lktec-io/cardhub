import { FiCheck } from 'react-icons/fi';
import { GlassCard, Badge, Button } from '../ui';
import { TemplateThumb } from './TemplateThumb';
import { getCategoryLabel } from '../../constants/templateCategories';
import { formatCardPrice } from '../../constants/pricingTiers';
import { useLanguage } from '../../hooks/useLanguage';

export function TemplateCard({ template, onPreview, onSelect, onUse, onBuy, isSelected = false }) {
  const hasSecondaryAction = Boolean(onPreview) || Boolean(onSelect);
  const { t } = useLanguage();
  const categoryLabel = t(`category.${template.category}`) === `category.${template.category}`
    ? getCategoryLabel(template.category)
    : t(`category.${template.category}`);

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
            variant={isSelected ? 'primary' : 'secondary'}
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
