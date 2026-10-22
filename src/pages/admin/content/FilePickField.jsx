import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FiFilm, FiImage, FiUploadCloud } from 'react-icons/fi';
import { Button } from '../../../components/ui';

const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_ACCEPT = ['video/mp4', 'video/webm'];
const MB = 1024 * 1024;

/**
 * File chooser with a local preview. The type/size check here only saves a
 * wasted upload; the server re-checks the actual file contents.
 */
export function FilePickField({ label, kind = 'image', file, onChange, currentUrl, maxMb = kind === 'video' ? 200 : 8, error, hint, disabled }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const accept = kind === 'video' ? VIDEO_ACCEPT : IMAGE_ACCEPT;
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => objectUrl && URL.revokeObjectURL(objectUrl), [objectUrl]);

  const previewUrl = file ? objectUrl : currentUrl;

  function pick(next) {
    setLocalError('');
    if (!next) return;
    if (!accept.includes(next.type)) {
      setLocalError(kind === 'video' ? 'Use an MP4 or WEBM video.' : 'Use a JPG, PNG or WEBP image.');
      return;
    }
    if (next.size > maxMb * MB) {
      setLocalError(`That file is larger than ${maxMb} MB.`);
      return;
    }
    onChange(next);
  }

  const shownError = localError || error;

  return (
    <div className="ch-field ch-filepick">
      {label && (
        <label className="ch-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div
        className={`ch-filepick__box ${shownError ? 'ch-filepick__box--error' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) pick(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="ch-filepick__preview">
          {previewUrl ? (
            kind === 'video' ? (
              <video src={previewUrl} muted playsInline controls preload="metadata" />
            ) : (
              <img src={previewUrl} alt="" />
            )
          ) : (
            <span className="ch-filepick__placeholder" aria-hidden="true">
              {kind === 'video' ? <FiFilm /> : <FiImage />}
            </span>
          )}
        </div>
        <div className="ch-filepick__body">
          <p className="ch-filepick__name">{file ? file.name : previewUrl ? 'Current file' : 'No file chosen'}</p>
          <p className="ch-filepick__hint">
            {hint || (kind === 'video' ? `MP4 or WEBM · up to ${maxMb} MB` : `JPG, PNG or WEBP · up to ${maxMb} MB`)}
          </p>
          <Button type="button" variant="secondary" size="sm" leftIcon={<FiUploadCloud aria-hidden="true" />} onClick={() => inputRef.current?.click()} disabled={disabled}>
            {previewUrl ? 'Choose another file' : 'Choose file'}
          </Button>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept.join(',')}
          className="ch-visually-hidden"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {shownError && (
        <p className="ch-field__error" role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}
