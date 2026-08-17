const SIZES = { sm: 16, md: 24, lg: 36 };

export function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  const px = SIZES[size] || SIZES.md;

  return (
    <span
      className={`ch-spinner ${className}`}
      style={{ width: px, height: px }}
      role="status"
      aria-label={label}
    />
  );
}
