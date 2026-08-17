const SAFE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif)$/i;

/** Only http(s) URLs pointing to a plausible image are accepted — no
 * javascript:/data: URIs, no arbitrary protocols. This is a best-effort
 * heuristic (no real upload/storage exists yet), not full validation. */
export function isSafeImageUrl(value) {
  if (typeof value !== 'string' || value.length > 2000) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return SAFE_EXTENSIONS.test(url.pathname);
}
