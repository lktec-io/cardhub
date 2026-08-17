export function MessageSection({ data, index = 0 }) {
  const message = data?.message?.trim();
  if (!message) return null;

  return (
    <section className="ch-inv-section ch-inv-message ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      {/* Plain text only — never dangerouslySetInnerHTML. React escapes this by default. */}
      <p className="ch-inv-message__text">{message}</p>
    </section>
  );
}
