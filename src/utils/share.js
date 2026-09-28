/**
 * Shares a link with the native share sheet where the browser supports
 * it (most mobile browsers), otherwise copies it to the clipboard.
 *
 * Resolves to one of:
 *   'shared'    — the native share sheet completed
 *   'cancelled' — the user closed the share sheet (not an error)
 *   'copied'    — fell back to copying the link
 *   'failed'    — neither was possible
 */
export async function shareLink({ title, text, url }) {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Some desktop browsers expose share() but reject it; fall through to copying.
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}

export async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Permission denied, so try the legacy path below.
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Absolute URL for an in-app path, e.g. '/ticket/t/abc' -> 'https://cardhub.co.tz/ticket/t/abc'. */
export function absoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}
