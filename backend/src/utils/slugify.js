import { randomBytes } from 'node:crypto';

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/** Collision-resistant slug: `<slug>-<5 hex chars>`, e.g. `leonard-neema-wedding-a8f32`. */
export function uniqueSlug(text) {
  const base = slugify(text) || 'event';
  const suffix = randomBytes(3).toString('hex').slice(0, 5);
  return `${base}-${suffix}`;
}
