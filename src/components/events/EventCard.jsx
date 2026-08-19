import { Link } from 'react-router-dom';
import { FiCopy, FiTrash2 } from 'react-icons/fi';
import { GlassCard, Button } from '../ui';
import { EventStatusBadge } from './EventStatusBadge';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

export function EventCard({ event, onDuplicate, onDelete, isDuplicating = false }) {
  const { t } = useLanguage();
  const colors = event.template?.config?.colors;
  const swatchStyle = colors ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : undefined;

  function formatDate(dateStr) {
    if (!dateStr) return t('eventCard.dateNotSet');
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <GlassCard hoverable className="ch-event-card">
      <Link to={ROUTES.eventDetail(event.id)}>
        <div className="ch-event-card__swatch" style={swatchStyle} />
      </Link>

      <div className="ch-event-card__header">
        <h3 className="ch-event-card__title">
          <Link to={ROUTES.eventDetail(event.id)}>{event.title}</Link>
        </h3>
        <EventStatusBadge status={event.status} />
      </div>

      <div className="ch-event-card__meta">
        <span>{t(`category.${event.eventType}`)}</span>
        <span>&middot;</span>
        <span>{formatDate(event.eventDate)}</span>
      </div>

      <div className="ch-event-card__actions">
        <Link to={ROUTES.eventDetail(event.id)} className="ch-btn ch-btn--secondary ch-btn--sm">
          {t('eventCard.open')}
        </Link>
        <Button variant="ghost" size="sm" isLoading={isDuplicating} onClick={() => onDuplicate(event)}>
          <FiCopy aria-hidden="true" /> {t('eventCard.duplicate')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(event)}>
          <FiTrash2 aria-hidden="true" /> {t('eventCard.delete')}
        </Button>
      </div>
    </GlassCard>
  );
}
