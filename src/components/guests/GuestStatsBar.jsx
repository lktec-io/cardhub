export function GuestStatsBar({ stats }) {
  const items = [
    { label: 'Total Guests', value: stats.total },
    { label: 'Attending', value: stats.attending, tone: 'success' },
    { label: 'Pending', value: stats.pending },
    { label: 'Declined', value: stats.declined, tone: 'danger' },
  ];

  return (
    <div className="ch-guest-stats">
      {items.map((item) => (
        <div key={item.label} className={`ch-guest-stats__tile ${item.tone ? `ch-guest-stats__tile--${item.tone}` : ''}`}>
          <span className="ch-guest-stats__value">{item.value}</span>
          <span className="ch-guest-stats__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
