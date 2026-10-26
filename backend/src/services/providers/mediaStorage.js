import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { pool } from '../../config/db.js';

/**
 * Admin-managed media on this server's own disk (the VPS), under
 * env.media.root, served read-only at <API_URL>/media/<key> (app.js).
 *
 * Safety rules:
 *   - A file's type is decided by its first bytes (magic number), never by
 *     the client-supplied name or MIME type.
 *   - Stored names are server-generated (<folder>/<yyyy>/<uuid>.<ext>);
 *     nothing from the original filename ever reaches the filesystem path.
 *   - Uploads land in a temp folder first and are only moved into place
 *     after validation, so a rejected file never becomes publicly reachable.
 *   - Keys are re-validated before any delete, so a crafted key can't
 *     escape the media root.
 */

export const MEDIA_KINDS = {
  image: {
    maxBytes: 8 * 1024 * 1024,
    types: [
      { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
      { ext: 'png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
      { ext: 'webp', mime: 'image/webp', test: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
    ],
  },
  video: {
    maxBytes: 200 * 1024 * 1024,
    types: [
      // ISO base media (MP4/M4V/MOV-compatible "ftyp" box at offset 4)
      { ext: 'mp4', mime: 'video/mp4', test: (b) => b.toString('ascii', 4, 8) === 'ftyp' },
      { ext: 'webm', mime: 'video/webm', test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
    ],
  },
};

const FOLDERS = new Set(['cards', 'posters', 'videos', 'video-posters']);
const KEY_RE = /^media\/(cards|posters|videos|video-posters)\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/;

export const mediaStorage = {
  root: env.media.root,
  tempDir: path.join(env.media.root, '.incoming'),

  async ensureReady() {
    await mkdir(this.tempDir, { recursive: true });
  },

  /** Is this a key this provider created (and therefore safe to resolve/delete)? */
  isMediaKey(value) {
    return typeof value === 'string' && KEY_RE.test(value);
  },

  /**
   * Validates an uploaded temp file (multer disk storage) and moves it into
   * place. Returns { key, mimeType, sizeBytes }. Always removes the temp
   * file on failure.
   */
  async commit(tempPath, { kind, folder }) {
    const spec = MEDIA_KINDS[kind];
    if (!spec || !FOLDERS.has(folder)) throw ApiError.internal('Invalid media destination');

    try {
      const { size } = await stat(tempPath);
      if (size === 0) throw ApiError.badRequest('The uploaded file is empty');
      if (size > spec.maxBytes) throw ApiError.badRequest(`File is too large — the limit is ${Math.round(spec.maxBytes / 1024 / 1024)} MB`);

      const header = Buffer.alloc(16);
      const handle = await open(tempPath, 'r');
      try {
        await handle.read(header, 0, 16, 0);
      } finally {
        await handle.close();
      }
      const type = spec.types.find((t) => t.test(header));
      if (!type) {
        const allowed = spec.types.map((t) => t.ext.toUpperCase()).join(', ');
        throw ApiError.badRequest(`Unsupported file. Upload a ${allowed} ${kind}.`);
      }

      const year = String(new Date().getUTCFullYear());
      const key = `media/${folder}/${year}/${randomUUID()}.${type.ext}`;
      const destination = this.pathFor(key);
      await mkdir(path.dirname(destination), { recursive: true });
      await rename(tempPath, destination);
      return { key, mimeType: type.mime, sizeBytes: size };
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => {});
      logger.warn('Media upload rejected', { folder, reason: error.message });
      throw error;
    }
  },

  pathFor(key) {
    if (!this.isMediaKey(key)) throw ApiError.badRequest('Invalid media key');
    // key starts with "media/"; files live directly under root.
    const resolved = path.resolve(this.root, key.slice('media/'.length));
    if (!resolved.startsWith(path.resolve(this.root) + path.sep)) throw ApiError.badRequest('Invalid media key');
    return resolved;
  },

  /** Best-effort delete of a file this provider created. Never throws for a missing file. */
  async remove(key) {
    if (!this.isMediaKey(key)) return;
    await rm(this.pathFor(key), { force: true }).catch((error) => logger.warn('Media file could not be removed', { key, reason: error.code || error.message }));
  },

  /** How many rows still point at a stored file (events, cards, videos and their posters). */
  async countReferences(key, db = pool) {
    const [rows] = await db.query(
      `SELECT (SELECT COUNT(*) FROM events WHERE cover_image = ?)
            + (SELECT COUNT(*) FROM event_templates WHERE preview_image = ?)
            + (SELECT COUNT(*) FROM media_assets WHERE file_key = ? OR poster_key = ?) AS n`,
      [key, key, key, key]
    );
    return Number(rows[0].n);
  },

  /**
   * Deletes a managed file only when nothing references it any more. Call it
   * AFTER the database change that dropped the reference has succeeded, so a
   * failed update never leaves a record pointing at a deleted file.
   */
  async removeIfUnreferenced(key) {
    if (!this.isMediaKey(key)) return false;
    const refs = await this.countReferences(key);
    if (refs > 0) {
      logger.info('Media file kept: still referenced', { key, refs });
      return false;
    }
    await this.remove(key);
    return true;
  },

  /** Public URL for a stored key: <API_URL>/media/... (served by app.js). */
  /** Absolute URL, for server-side consumers (e.g. a provider fetching a card image). Depends on API_URL. */
  urlFor(key) {
    return this.isMediaKey(key) ? `${env.apiUrl}/${key}` : null;
  },

  /**
   * Same-site path the browser loads, e.g. "/api/v1/media/posters/2026/<uuid>.jpg"
   * (served by the express.static mount in app.js). Used in API responses so
   * images never break because API_URL is unset or points at localhost; the
   * frontend resolves it against the API base it already uses.
   */
  publicPath(key) {
    return this.isMediaKey(key) ? `/api/v1/${key}` : null;
  },
};

/**
 * Turns any stored image reference into something a browser can load:
 * our own media keys become absolute API URLs; app paths and http(s) URLs
 * pass through unchanged; anything else is dropped.
 */
export function resolveMediaUrl(value) {
  if (!value || typeof value !== 'string') return null;
  if (mediaStorage.isMediaKey(value)) return mediaStorage.publicPath(value);
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return /^https?:\/\//i.test(value) ? value : null;
}
