import { ApiError } from '../utils/ApiError.js';
import { slugify, uniqueSlug } from '../utils/slugify.js';
import { templateRepository } from '../repositories/template.repository.js';
import { mediaAssetRepository } from '../repositories/mediaAsset.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { mediaStorage, resolveMediaUrl } from './providers/mediaStorage.js';
import { toPublicTemplate } from '../utils/serializeEvent.js';

/** Default design config for an admin-created card. The card IS the uploaded image; config only drives the invitation builder's colours. */
const DEFAULT_CARD_CONFIG = {
  theme: 'uploaded',
  layout: 'classic',
  colors: { primary: '#12305f', accent: '#dc2626' },
  fonts: { heading: 'Nunito', body: 'Nunito' },
};

async function audit(adminUserId, action, entityType, entityId, metadata, requestMeta) {
  await auditLogRepository.record({
    userId: adminUserId,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: requestMeta?.ipAddress,
    userAgent: requestMeta?.userAgent,
  });
}

/** Admin DTO for a card: the public template DTO plus what the catalogue editor needs. */
function toAdminCardDTO(row, { eventsUsing } = {}) {
  return { ...toPublicTemplate(row), sortOrder: row.sort_order, usesUploadedImage: mediaStorage.isMediaKey(row.preview_image), eventsUsing: eventsUsing ?? null };
}

function toMediaDTO(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category: row.category,
    url: resolveMediaUrl(row.file_key),
    posterUrl: resolveMediaUrl(row.poster_key),
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/** Public, anonymous-safe media DTO: only what the gallery renders. */
export function toPublicMediaDTO(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category: row.category,
    url: resolveMediaUrl(row.file_key),
    posterUrl: resolveMediaUrl(row.poster_key),
    mimeType: row.mime_type,
  };
}

async function generateCardSlug(name) {
  let slug = slugify(name) || 'card';
  if (await templateRepository.slugExists(slug)) slug = uniqueSlug(name);
  while (await templateRepository.slugExists(slug)) slug = uniqueSlug(name);
  return slug;
}

/**
 * Admin content management: the invitation card catalogue (event_templates)
 * and the promotional media library (media_assets). Files go through
 * mediaStorage (server disk). A replaced or deleted file is removed only
 * after the database no longer points at it.
 */
export const adminContentService = {
  // ---------------- Invitation cards ----------------

  async listCards() {
    const { rows } = await templateRepository.findAllAdmin({ limit: 500, offset: 0 });
    const usage = await Promise.all(rows.map((row) => templateRepository.countEventsUsing(row.id)));
    return rows.map((row, index) => toAdminCardDTO(row, { eventsUsing: usage[index] }));
  },

  async createCard(details, file, adminUserId, requestMeta) {
    if (!file) throw ApiError.validation([{ field: 'image', message: 'Upload the card image' }]);
    const stored = await mediaStorage.commit(file.path, { kind: 'image', folder: 'cards' });
    try {
      const row = await templateRepository.create({
        ...details,
        slug: await generateCardSlug(details.name),
        previewImage: stored.key,
        sortOrder: await templateRepository.nextSortOrder(),
        config: DEFAULT_CARD_CONFIG,
      });
      await audit(adminUserId, 'admin.card_created', 'template', row.id, { name: row.name, status: row.status }, requestMeta);
      return toAdminCardDTO(row, { eventsUsing: 0 });
    } catch (error) {
      await mediaStorage.remove(stored.key);
      throw error;
    }
  },

  async updateCard(id, details, adminUserId, requestMeta) {
    const existing = await templateRepository.findById(id);
    if (!existing) throw ApiError.notFound('Card not found');
    const row = await templateRepository.updateDetails(id, details);
    await audit(adminUserId, 'admin.card_updated', 'template', id, { status: details.status, pricingTier: details.pricingTier }, requestMeta);
    return toAdminCardDTO(row, { eventsUsing: await templateRepository.countEventsUsing(id) });
  },

  async replaceCardImage(id, file, adminUserId, requestMeta) {
    const existing = await templateRepository.findById(id);
    if (!existing) throw ApiError.notFound('Card not found');
    if (!file) throw ApiError.validation([{ field: 'image', message: 'Choose an image to upload' }]);
    const stored = await mediaStorage.commit(file.path, { kind: 'image', folder: 'cards' });
    const row = await templateRepository.updatePreviewImage(id, stored.key);
    await mediaStorage.remove(existing.preview_image); // only removes files this provider created
    await audit(adminUserId, 'admin.card_image_replaced', 'template', id, {}, requestMeta);
    return toAdminCardDTO(row, { eventsUsing: await templateRepository.countEventsUsing(id) });
  },

  async reorderCards(ids, adminUserId, requestMeta) {
    await templateRepository.reorder(ids);
    await audit(adminUserId, 'admin.cards_reordered', 'template', null, { count: ids.length }, requestMeta);
    return this.listCards();
  },

  /** Only a card no event uses can be deleted; otherwise it must be hidden instead (events keep their design). */
  async deleteCard(id, adminUserId, requestMeta) {
    const existing = await templateRepository.findById(id);
    if (!existing) throw ApiError.notFound('Card not found');
    const inUse = await templateRepository.countEventsUsing(id);
    if (inUse > 0) {
      throw ApiError.conflict(`This card is used by ${inUse} event${inUse === 1 ? '' : 's'}, so it can't be deleted. Hide it instead.`);
    }
    await templateRepository.deleteById(id);
    await mediaStorage.remove(existing.preview_image);
    await audit(adminUserId, 'admin.card_deleted', 'template', id, { name: existing.name }, requestMeta);
  },

  // ---------------- Promotional media ----------------

  async listMedia() {
    return (await mediaAssetRepository.findAll()).map(toMediaDTO);
  },

  async listPublishedMedia(kind) {
    return (await mediaAssetRepository.findAll({ kind, status: 'published' })).map(toPublicMediaDTO);
  },

  async createMedia(kind, details, file, adminUserId, requestMeta) {
    if (!file) throw ApiError.validation([{ field: 'file', message: `Upload the ${kind} file` }]);
    const stored = await mediaStorage.commit(file.path, { kind, folder: kind === 'video' ? 'videos' : 'posters' });
    try {
      const row = await mediaAssetRepository.create({ kind, ...details, fileKey: stored.key, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, createdBy: adminUserId });
      await audit(adminUserId, 'admin.media_created', 'media', row.id, { kind, status: row.status, sizeBytes: stored.sizeBytes }, requestMeta);
      return toMediaDTO(row);
    } catch (error) {
      await mediaStorage.remove(stored.key);
      throw error;
    }
  },

  async updateMedia(id, details, adminUserId, requestMeta) {
    if (!(await mediaAssetRepository.findById(id))) throw ApiError.notFound('Media item not found');
    const row = await mediaAssetRepository.updateDetails(id, details);
    await audit(adminUserId, 'admin.media_updated', 'media', id, { status: details.status }, requestMeta);
    return toMediaDTO(row);
  },

  /** Thumbnail shown before a video plays (and while it loads on slow connections). */
  async replaceMediaPoster(id, file, adminUserId, requestMeta) {
    const existing = await mediaAssetRepository.findById(id);
    if (!existing) throw ApiError.notFound('Media item not found');
    if (!file) throw ApiError.validation([{ field: 'image', message: 'Choose a poster image' }]);
    const stored = await mediaStorage.commit(file.path, { kind: 'image', folder: 'video-posters' });
    const row = await mediaAssetRepository.updatePoster(id, stored.key);
    await mediaStorage.remove(existing.poster_key);
    await audit(adminUserId, 'admin.media_poster_replaced', 'media', id, {}, requestMeta);
    return toMediaDTO(row);
  },

  async reorderMedia(ids, adminUserId, requestMeta) {
    await mediaAssetRepository.reorder(ids);
    await audit(adminUserId, 'admin.media_reordered', 'media', null, { count: ids.length }, requestMeta);
    return this.listMedia();
  },

  async deleteMedia(id, adminUserId, requestMeta) {
    const existing = await mediaAssetRepository.findById(id);
    if (!existing) throw ApiError.notFound('Media item not found');
    await mediaAssetRepository.deleteById(id);
    await mediaStorage.remove(existing.file_key);
    await mediaStorage.remove(existing.poster_key);
    await audit(adminUserId, 'admin.media_deleted', 'media', id, { kind: existing.kind, title: existing.title }, requestMeta);
  },
};
