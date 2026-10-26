import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export function Modal({ isOpen, onClose, title, children, footer, size = 'md', className = '' }) {
  const dialogRef = useRef(null);
  // Latest onClose without re-running the open effect: callers often pass an
  // inline function, and re-running would re-focus the dialog on every render,
  // stealing focus from whatever input the user is typing in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="ch-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={dialogRef}
        className={`ch-modal ch-modal--${size} ch-animate-scale-in ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'ch-modal-title' : undefined}
        tabIndex={-1}
      >
        <div className="ch-modal__header">
          {title && (
            <h3 className="ch-modal__title" id="ch-modal-title">
              {title}
            </h3>
          )}
          <button type="button" className="ch-modal__close" onClick={onClose} aria-label="Close dialog">
            <FiX />
          </button>
        </div>
        <div className="ch-modal__body">{children}</div>
        {footer && <div className="ch-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
