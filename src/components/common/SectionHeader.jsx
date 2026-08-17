export function SectionHeader({ eyebrow, title, description, align = 'left', className = '' }) {
  return (
    <div className={`ch-section-header ch-section-header--${align} ${className}`}>
      {eyebrow && <p className="ch-section-header__eyebrow">{eyebrow}</p>}
      <h2 className="ch-section-header__title">{title}</h2>
      {description && <p className="ch-section-header__description">{description}</p>}
    </div>
  );
}
