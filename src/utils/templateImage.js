/** The frontend-owned catalogue image directory — see public/cards/README.md. */
const LOCAL_CATALOGUE_IMAGE_DIR = '/cards';

/**
 * Resolves a built-in catalogue template's local, frontend-owned image
 * path from its slug (e.g. 'elegant-ivory' -> '/cards/elegant-ivory.jpg').
 * Returns null when there's no usable slug to build a path from.
 */
export function getLocalCatalogueImagePath(slug) {
  if (!slug || typeof slug !== 'string') return null;
  return `${LOCAL_CATALOGUE_IMAGE_DIR}/${slug}.jpg`;
}
