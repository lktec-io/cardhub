import { FiCheck, FiSmartphone } from 'react-icons/fi';
import { GlassCard, Badge, Button } from '../ui';
import { getCategoryLabel } from '../../constants/templateCategories';

export function TemplateCard({ template, onPreview, onSelect, isSelected = false }) {
  const colors = template.config?.colors;
  const swatchStyle = colors
    ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }
    : undefined;

  return (
    <GlassCard
      hoverable
      className={`ch-template-card ${isSelected ? 'ch-template-card--selected' : ''}`}
    >
      <div className="ch-template-card__swatch" style={swatchStyle}>
        <FiSmartphone aria-hidden="true" />
        {isSelected && (
          <span className="ch-template-card__selected-badge">
            <FiCheck aria-hidden="true" />
          </span>
        )}
      </div>
      <Badge variant="default">{getCategoryLabel(template.category)}</Badge>
      <h3 className="ch-h4">{template.name}</h3>
      {template.description && <p className="ch-body-sm">{template.description}</p>}
      <div className="ch-template-card__actions">
        {onPreview && (
          <Button variant="outline" size="sm" fullWidth={!onSelect} onClick={() => onPreview(template)}>
            Preview
          </Button>
        )}
        {onSelect && (
          <Button
            variant={isSelected ? 'primary' : 'secondary'}
            size="sm"
            fullWidth={!onPreview}
            onClick={() => onSelect(template)}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
