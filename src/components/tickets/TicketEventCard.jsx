import { Link } from 'react-router-dom';
import { FiArrowRight, FiClock, FiMapPin } from 'react-icons/fi';
import { EventCover } from './EventCover';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTzs } from '../../utils/money';
import { dateBadgeParts, formatTicketDate, formatTimeRange } from '../../utils/ticketFormat';

export function TicketEventCard({ event }) {
  const { t } = useLanguage();
  const badge = dateBadgeParts(event.date);
  const to = ROUTES.ticketEvent(event.slug);

  return (
    <article className="ch-tix-card">
      <Link to={to} className="ch-tix-card__media" tabIndex={-1} aria-hidden="true">
        <EventCover src={event.coverImage} alt="" />
        <span className="ch-tix-tag ch-tix-card__category">{t(`category.${event.category}`)}</span>
        {event.soldOut && <span className="ch-tix-tag ch-tix-tag--dark ch-tix-card__soldout">{t('tix.soldOut')}</span>}
      </Link>

      <div className="ch-tix-card__body">
        <div className="ch-tix-card__heading">
          {badge && (
            <span className="ch-tix-datebadge" aria-hidden="true">
              <span className="ch-tix-datebadge__month">{badge.month}</span>
              <span className="ch-tix-datebadge__day">{badge.day}</span>
            </span>
          )}
          <div className="ch-tix-card__titles">
            <h3 className="ch-tix-card__title">
              <Link to={to}>{event.title}</Link>
            </h3>
            <p className="ch-tix-card__date">{formatTicketDate(event.date, { weekday: true, short: true })}</p>
          </div>
        </div>

        <ul className="ch-tix-card__meta">
          {event.startTime && (
            <li>
              <FiClock aria-hidden="true" />
              <span>{formatTimeRange(event.startTime, event.endTime)}</span>
            </li>
          )}
          {event.venue?.name && (
            <li>
              <FiMapPin aria-hidden="true" />
              <span>{[event.venue.name, event.venue.address].filter(Boolean).join(', ')}</span>
            </li>
          )}
        </ul>

        {event.description && <p className="ch-tix-card__description">{event.description}</p>}

        <div className="ch-tix-card__footer">
          <p className="ch-tix-card__price">
            {event.startingPriceTzs !== null && (
              <>
                <span>{t('tix.from')}</span>
                <strong>{formatTzs(event.startingPriceTzs)}</strong>
              </>
            )}
          </p>
          <Link to={to} className="ch-btn ch-btn--brand ch-btn--sm">
            {t('tix.viewEvent')}
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
