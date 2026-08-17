export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`ch-empty-state ${className}`}>
      {icon && <div className="ch-empty-state__icon">{icon}</div>}
      {title && <h4 className="ch-empty-state__title">{title}</h4>}
      {description && <p className="ch-empty-state__description">{description}</p>}
      {action && <div className="ch-empty-state__action">{action}</div>}
    </div>
  );
}
