import { useState } from 'react';
import { FiCalendar } from 'react-icons/fi';

/** Event cover image with a quiet navy fallback. Never shows a broken-image icon. */
export function EventCover({ src, alt, className = '', eager = false }) {
  // Remember which src failed, so a replaced poster gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div className={`ch-tix-cover ${showImage ? '' : 'ch-tix-cover--fallback'} ${className}`}>
      {showImage ? (
        <>
          {/* Same image, blurred, fills the frame so the full poster can be shown uncropped on top. */}
          <img className="ch-tix-cover__fill" src={src} alt="" aria-hidden="true" loading={eager ? 'eager' : 'lazy'} decoding="async" />
          <img
            className="ch-tix-cover__art"
            src={src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => {
              console.warn('Event image failed to load:', src);
              setFailedSrc(src);
            }}
          />
        </>
      ) : (
        <FiCalendar aria-hidden="true" />
      )}
    </div>
  );
}
