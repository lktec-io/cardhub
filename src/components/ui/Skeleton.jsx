export function Skeleton({ width = '100%', height = '16px', radius, circle = false, className = '' }) {
  return (
    <span
      className={`ch-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: circle ? '999px' : radius || 'var(--radius-sm)',
      }}
      aria-hidden="true"
    />
  );
}
