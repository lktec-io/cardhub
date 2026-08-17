export function GlassCard({ className = '', hoverable = false, children, ...rest }) {
  return (
    <div className={`ch-glass-card ${hoverable ? 'ch-glass-card--hoverable' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
