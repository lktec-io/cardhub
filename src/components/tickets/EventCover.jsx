import { useState } from 'react';
import { FiCalendar } from 'react-icons/fi';

/** Event cover image with a quiet navy fallback. Never shows a broken-image icon. */
export function EventCover({ src, alt, className = '', eager = false }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={`ch-tix-cover ${showImage ? '' : 'ch-tix-cover--fallback'} ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <FiCalendar aria-hidden="true" />
      )}
    </div>
  );
}
