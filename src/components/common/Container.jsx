export function Container({ className = '', children, ...rest }) {
  return (
    <div className={`ch-container ${className}`} {...rest}>
      {children}
    </div>
  );
}
