import { rm } from 'node:fs/promises';
import { adminContentService } from '../services/adminContent.service.js';
import { validateCardDetails, validateIdList, validateMediaDetails, validateNumericId } from '../validators/adminContent.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function meta(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

/**
 * Wraps an upload handler so the multer temp file is always removed when
 * the request ends — success (already moved by mediaStorage.commit, so this
 * is a no-op) or any failure (validation, not found, bad file type).
 */
function withTempCleanup(handler) {
  return asyncHandler(async (req, res) => {
    try {
      await handler(req, res);
    } finally {
      if (req.file?.path) await rm(req.file.path, { force: true }).catch(() => {});
    }
  });
}

export const adminContentController = {
  // ---------- cards ----------
  listCards: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: { cards: await adminContentService.listCards() } });
  }),

  createCard: withTempCleanup(async (req, res) => {
    const details = validateCardDetails(req.body);
    const card = await adminContentService.createCard(details, req.file, req.user.id, meta(req));
    sendSuccess(res, { statusCode: 201, message: 'Card added', data: { card } });
  }),

  updateCard: asyncHandler(async (req, res) => {
    const id = validateNumericId(req.params.id);
    const card = await adminContentService.updateCard(id, validateCardDetails(req.body), req.user.id, meta(req));
    sendSuccess(res, { message: 'Card updated', data: { card } });
  }),

  replaceCardImage: withTempCleanup(async (req, res) => {
    const id = validateNumericId(req.params.id);
    const card = await adminContentService.replaceCardImage(id, req.file, req.user.id, meta(req));
    sendSuccess(res, { message: 'Card image replaced', data: { card } });
  }),

  reorderCards: asyncHandler(async (req, res) => {
    const cards = await adminContentService.reorderCards(validateIdList(req.body.ids), req.user.id, meta(req));
    sendSuccess(res, { message: 'Order saved', data: { cards } });
  }),

  deleteCard: asyncHandler(async (req, res) => {
    await adminContentService.deleteCard(validateNumericId(req.params.id), req.user.id, meta(req));
    sendSuccess(res, { message: 'Card deleted' });
  }),

  // ---------- media ----------
  listMedia: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: { media: await adminContentService.listMedia() } });
  }),

  createVideo: withTempCleanup(async (req, res) => {
    const item = await adminContentService.createMedia('video', validateMediaDetails(req.body), req.file, req.user.id, meta(req));
    sendSuccess(res, { statusCode: 201, message: 'Video uploaded', data: { item } });
  }),

  updateMedia: asyncHandler(async (req, res) => {
    const item = await adminContentService.updateMedia(validateNumericId(req.params.id), validateMediaDetails(req.body), req.user.id, meta(req));
    sendSuccess(res, { message: 'Media updated', data: { item } });
  }),

  replaceMediaPoster: withTempCleanup(async (req, res) => {
    const item = await adminContentService.replaceMediaPoster(validateNumericId(req.params.id), req.file, req.user.id, meta(req));
    sendSuccess(res, { message: 'Poster updated', data: { item } });
  }),

  reorderMedia: asyncHandler(async (req, res) => {
    const media = await adminContentService.reorderMedia(validateIdList(req.body.ids), req.user.id, meta(req));
    sendSuccess(res, { message: 'Order saved', data: { media } });
  }),

  deleteMedia: asyncHandler(async (req, res) => {
    await adminContentService.deleteMedia(validateNumericId(req.params.id), req.user.id, meta(req));
    sendSuccess(res, { message: 'Media deleted' });
  }),

  // ---------- public ----------
  listPublicVideos: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: { videos: await adminContentService.listPublishedMedia('video') } });
  }),
};
