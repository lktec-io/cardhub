import { forwardRef } from 'react';
import { FiLoader } from 'react-icons/fi';

const VARIANTS = ['primary', 'secondary', 'ghost', 'outline', 'danger'];
const SIZES = ['sm', 'md', 'lg'];

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    children,
    ...rest
  },
  ref
) {
  const variantClass = VARIANTS.includes(variant) ? variant : 'primary';
  const sizeClass = SIZES.includes(size) ? size : 'md';

  return (
    <button
      ref={ref}
      className={`ch-btn ch-btn--${variantClass} ch-btn--${sizeClass} ${fullWidth ? 'ch-btn--full' : ''} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <FiLoader className="ch-btn__icon ch-spin" aria-hidden="true" />
      ) : (
        leftIcon && <span className="ch-btn__icon">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="ch-btn__icon">{rightIcon}</span>}
    </button>
  );
});
