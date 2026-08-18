// Always the production domain, regardless of where this actually renders
// (localhost dev, a preview deploy, etc.) — a canonical/og:url pointing at
// anything but the real production domain is worse than none at all.
const CANONICAL_ORIGIN = 'https://cardhub.co.tz';

/**
 * React 19 hoists <title>/<meta>/<link> rendered anywhere in the tree into
 * <head> automatically — no react-helmet or similar dependency needed for
 * this level of SEO foundation.
 */
export function Seo({ title, description }) {
  const fullTitle = title ? `${title} — CardHub` : 'CardHub — Digital Cards Made Simple';
  const canonicalUrl = `${CANONICAL_ORIGIN}${typeof window !== 'undefined' ? window.location.pathname : ''}`;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="CardHub" />
      <meta property="og:url" content={canonicalUrl} />
    </>
  );
}
