import { FiCalendar, FiClock, FiGlobe } from 'react-icons/fi';
import { formatEventDate, formatEventTime } from '../../../utils/formatEventDateTime';

export function DetailsSection({ event, index = 0 }) {
  const date = formatEventDate(event.eventDate, { long: true });
  const time = formatEventTime(event.eventTime);

  if (!date && !time) return null;

  return (
    <section className="ch-inv-section ch-inv-details ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="ch-inv-details__grid">
        {date && (
          <div className="ch-inv-details__item">
            <FiCalendar aria-hidden="true" />
            <span>{date}</span>
          </div>
        )}
        {time && (
          <div className="ch-inv-details__item">
            <FiClock aria-hidden="true" />
            <span>{time}</span>
          </div>
        )}
        {event.timezone && (
          <div className="ch-inv-details__item">
            <FiGlobe aria-hidden="true" />
            <span>{event.timezone.replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>
    </section>
  );
}
