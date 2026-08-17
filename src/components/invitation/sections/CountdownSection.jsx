import { daysUntil } from '../../../utils/formatEventDateTime';

export function CountdownSection({ event, index = 0 }) {
  const days = daysUntil(event.eventDate);
  if (days === null) return null;

  let label;
  if (days > 1) label = `${days} days to go`;
  else if (days === 1) label = 'Tomorrow!';
  else if (days === 0) label = 'Today!';
  else label = 'Thank you for celebrating with us';

  return (
    <section className="ch-inv-section ch-inv-countdown ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <p className="ch-inv-countdown__label">{label}</p>
    </section>
  );
}
