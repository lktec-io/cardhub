export function Divider({ label, className = '' }) {
  if (label) {
    return (
      <div className={`ch-divider ch-divider--label ${className}`} role="separator">
        <span>{label}</span>
      </div>
    );
  }
  return <hr className={`ch-divider ${className}`} />;
}
