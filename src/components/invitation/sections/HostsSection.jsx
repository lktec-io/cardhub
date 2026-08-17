const BULLET = String.fromCharCode(8226);

export function HostsSection({ event, data, index = 0 }) {
  const hosts = data?.hosts?.length ? data.hosts : event.hostName ? [event.hostName] : [];
  if (hosts.length === 0) return null;

  return (
    <section className="ch-inv-section ch-inv-hosts ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <p className="ch-inv-hosts__label">Hosted by</p>
      <p className="ch-inv-hosts__names">{hosts.join(` ${BULLET} `)}</p>
    </section>
  );
}
