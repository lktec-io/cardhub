/**
 * React 19 hoists <title>/<meta>/<link> rendered anywhere in the tree into
 * <head> automatically — no react-helmet or similar dependency needed for
 * this level of SEO foundation.
 */
export function Seo({ title, description }) {
  const fullTitle = title ? `${title} — CardHub` : 'CardHub — Digital Invitations & Event Experiences';

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="CardHub" />
    </>
  );
}
