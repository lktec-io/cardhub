import { FiMapPin } from 'react-icons/fi';

export function VenueSection({ event, index = 0 }) {
  const name = event.venue?.name;
  const address = event.venue?.address;
  if (!name && !address) return null;

  return (
    <section className="ch-inv-section ch-inv-venue ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <FiMapPin className="ch-inv-venue__icon" aria-hidden="true" />
      {name && <h3 className="ch-inv-venue__name">{name}</h3>}
      {address && <p className="ch-inv-venue__address">{address}</p>}
    </section>
  );
}
