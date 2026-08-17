import { FiAlertTriangle, FiCheckCircle, FiInfo, FiXCircle } from 'react-icons/fi';

const ICONS = {
  info: FiInfo,
  success: FiCheckCircle,
  warning: FiAlertTriangle,
  danger: FiXCircle,
};

export function Alert({ variant = 'info', title, children, className = '' }) {
  const Icon = ICONS[variant] || FiInfo;

  return (
    <div className={`ch-alert ch-alert--${variant} ${className}`} role="alert">
      <Icon className="ch-alert__icon" aria-hidden="true" />
      <div className="ch-alert__content">
        {title && <p className="ch-alert__title">{title}</p>}
        {children && <div className="ch-alert__body">{children}</div>}
      </div>
    </div>
  );
}
