export function Card({ className = '', hoverable = false, children, ...rest }) {
  return (
    <div className={`ch-card ${hoverable ? 'ch-card--hoverable' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
