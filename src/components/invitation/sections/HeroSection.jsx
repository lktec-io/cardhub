const OCCASION_PHRASES = {
  wedding: 'celebrate their wedding',
  birthday: 'celebrate their birthday',
  graduation: 'celebrate this achievement',
  anniversary: 'celebrate their anniversary',
  send_off: 'send them off in style',
  baby_shower: 'welcome their little one',
  party: 'join the celebration',
  corporate: 'join us',
  other: 'celebrate with us',
};

export function HeroSection({ event, data, coverImage, index = 0 }) {
  const heading = event.hostName || event.title;
  const subtitle = data?.subtitle?.trim() || `invite you to ${OCCASION_PHRASES[event.eventType] || 'celebrate with them'}`;

  return (
    <section
      className="ch-inv-hero ch-animate-fade-in"
      style={{ animationDelay: `${index * 80}ms`, backgroundImage: coverImage ? `url(${coverImage})` : undefined }}
    >
      <div className="ch-inv-hero__overlay" />
      <div className="ch-inv-hero__content">
        <p className="ch-inv-hero__eyebrow">You&rsquo;re invited</p>
        <h1 className="ch-inv-hero__title">{heading}</h1>
        <p className="ch-inv-hero__subtitle">{subtitle}</p>
      </div>
    </section>
  );
}
