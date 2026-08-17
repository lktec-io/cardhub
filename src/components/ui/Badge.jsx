export function Badge({ variant = 'default', className = '', children }) {
  return <span className={`ch-badge ch-badge--${variant} ${className}`}>{children}</span>;
}
