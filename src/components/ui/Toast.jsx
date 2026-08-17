import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';

const ICONS = {
  info: FiInfo,
  success: FiCheckCircle,
  warning: FiAlertTriangle,
  danger: FiXCircle,
};

export function Toast({ variant = 'info', children, onClose }) {
  const Icon = ICONS[variant] || FiInfo;

  return (
    <div className={`ch-toast ch-toast--${variant} ch-animate-slide-up`} role="status">
      <Icon className="ch-toast__icon" aria-hidden="true" />
      <p className="ch-toast__message">{children}</p>
      <button type="button" className="ch-toast__close" onClick={onClose} aria-label="Dismiss notification">
        <FiX />
      </button>
    </div>
  );
}
