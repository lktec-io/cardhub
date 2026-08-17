export function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header className={`ch-page-header ${className}`}>
      <div>
        {eyebrow && <p className="ch-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="ch-page-header__title">{title}</h1>
        {description && <p className="ch-page-header__description">{description}</p>}
      </div>
      {actions && <div className="ch-page-header__actions">{actions}</div>}
    </header>
  );
}
