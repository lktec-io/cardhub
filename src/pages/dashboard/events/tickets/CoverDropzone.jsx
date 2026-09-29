import { useEffect, useRef, useState } from 'react';
import { FiImage, FiLink, FiRefreshCw, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { Alert, Button, Input } from '../../../../components/ui';
import { uploadsService } from '../../../../services/uploadsService';
import { getErrorMessage } from '../../../../utils/mapValidationErrors';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Event cover: drag-and-drop or browse, uploaded through the existing
 * authenticated /uploads/images endpoint (purpose "cover"). When the
 * server has no image storage connected, the upload is refused honestly
 * and the organizer can paste an image link instead. Nothing here ever
 * shows a cover as "uploaded" unless the server returned a real URL.
 */
export function CoverDropzone({ value, onChange, uploadsAvailable, error, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(null); // { previewUrl, name }
  const [uploadError, setUploadError] = useState('');
  const [showLink, setShowLink] = useState(!uploadsAvailable);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => () => uploading?.previewUrl && URL.revokeObjectURL(uploading.previewUrl), [uploading]);

  async function handleFile(file) {
    if (!file) return;
    setUploadError('');
    if (!ACCEPTED.includes(file.type)) {
      setUploadError('Use a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('That image is larger than 5 MB. Please choose a smaller file.');
      return;
    }
    if (!uploadsAvailable) {
      setUploadError('Direct upload isn’t connected on this server yet. Paste an image link below instead.');
      setShowLink(true);
      return;
    }
    setUploading({ previewUrl: URL.createObjectURL(file), name: file.name });
    try {
      const res = await uploadsService.uploadImage(file, 'cover');
      const url = res.data.data.image?.url;
      if (!url) throw new Error('No image URL returned');
      setPreviewFailed(false);
      onChange(url);
    } catch (err) {
      setUploadError(getErrorMessage(err, 'The upload didn’t go through. Please try again.'));
      setShowLink(true);
    } finally {
      setUploading(null);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFile(event.dataTransfer.files?.[0]);
  }

  const hasCover = Boolean(value) && !uploading;

  return (
    <div className="ch-tm-cover">
      {hasCover ? (
        <figure className="ch-tm-cover__preview">
          {previewFailed ? (
            <div className="ch-tm-cover__broken">
              <FiImage aria-hidden="true" />
              <span>This image link couldn’t be loaded. Check the address.</span>
            </div>
          ) : (
            <img src={value} alt="Event cover" onError={() => setPreviewFailed(true)} onLoad={() => setPreviewFailed(false)} />
          )}
          <figcaption className="ch-tm-cover__actions">
            <Button variant="secondary" size="sm" leftIcon={<FiRefreshCw aria-hidden="true" />} onClick={() => inputRef.current?.click()} disabled={disabled}>
              Replace
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={() => onChange('')} disabled={disabled}>
              Remove
            </Button>
          </figcaption>
        </figure>
      ) : (
        <div
          className={`ch-tm-cover__drop ${isDragging ? 'ch-tm-cover__drop--active' : ''} ${uploading ? 'ch-tm-cover__drop--busy' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <>
              <img className="ch-tm-cover__uploading-preview" src={uploading.previewUrl} alt="" />
              <p className="ch-tm-cover__title">Uploading {uploading.name}…</p>
            </>
          ) : (
            <>
              <span className="ch-tm-cover__icon" aria-hidden="true">
                <FiUploadCloud />
              </span>
              <p className="ch-tm-cover__title">Drag and drop your cover image</p>
              <p className="ch-tm-cover__hint">JPG, PNG or WEBP · up to 5 MB · landscape 16:10 works best</p>
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
                Browse files
              </Button>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="ch-visually-hidden"
        tabIndex={-1}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {uploadError && <Alert variant="warning">{uploadError}</Alert>}

      {showLink ? (
        <Input
          label="Cover image link"
          icon={<FiLink aria-hidden="true" />}
          placeholder="https://…/cover.jpg"
          value={value}
          onChange={(e) => {
            setPreviewFailed(false);
            onChange(e.target.value);
          }}
          error={error}
          hint={!error ? 'An https link to a .jpg, .png or .webp image.' : undefined}
          disabled={disabled}
          inputMode="url"
        />
      ) : (
        <button type="button" className="ch-tm-linkbtn" onClick={() => setShowLink(true)}>
          <FiLink aria-hidden="true" />
          Use an image link instead
        </button>
      )}
      {!showLink && error && <p className="ch-field__error">{error}</p>}
    </div>
  );
}
