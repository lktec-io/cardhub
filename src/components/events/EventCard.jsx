import { Link } from 'react-router-dom';
import { FiCopy, FiTrash2 } from 'react-icons/fi';
import { GlassCard, Button } from '../ui';
import { EventStatusBadge } from './EventStatusBadge';
import { getEventTypeLabel } from '../../constants/eventTypes';
import { ROUTES } from '../../constants/routes';

function formatDate(dateStr) {
  if (!dateStr) return 'Date not set';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function EventCard({ event, onDuplicate, onDelete, isDuplicating = false }) {
  const colors = event.template?.config?.colors;
  const swatchStyle = colors ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : undefined;

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
        <span>{getEventTypeLabel(event.eventType)}</span>
        <span>&middot;</span>
        <span>{formatDate(event.eventDate)}</span>
      </div>

      <div className="ch-event-card__actions">
        <Link to={ROUTES.eventDetail(event.id)} className="ch-btn ch-btn--secondary ch-btn--sm">
          Open
        </Link>
        <Button variant="ghost" size="sm" isLoading={isDuplicating} onClick={() => onDuplicate(event)}>
          <FiCopy aria-hidden="true" /> Duplicate
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(event)}>
          <FiTrash2 aria-hidden="true" /> Delete
        </Button>
      </div>
    </GlassCard>
  );
}
