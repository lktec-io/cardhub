const SIZES = { sm: 28, md: 36, lg: 48 };

function initialsFrom(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export function Avatar({ src, name, size = 'md', className = '' }) {
  const px = SIZES[size] || SIZES.md;

  return (
    <span
      className={`ch-avatar ${className}`}
      style={{ width: px, height: px, fontSize: px * 0.4 }}
    >
      {src ? <img src={src} alt={name || 'Avatar'} /> : <span>{initialsFrom(name)}</span>}
    </span>
  );
}
