/** Saves a Blob as a file via a temporary object URL. */
export function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

/**
 * Downloads the actual image file behind a URL, not the page it sits on.
 * Fetches it as a Blob first so `download` works on any same-origin or
 * CORS-enabled image. If the fetch is refused (a cross-origin host
 * without CORS), falls back to opening the image in a new tab so the
 * user can still save it. Resolves 'downloaded' or 'opened'.
 */
export async function downloadFromUrl(url, filename) {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Not an image');
    downloadBlob(blob, filename);
    return 'downloaded';
  } catch {
    window.open(url, '_blank', 'noopener');
    return 'opened';
  }
}

/** A filesystem-safe filename fragment. */
export function toFileSlug(value) {
  return (
    String(value || 'cardhub')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'cardhub'
  );
}
