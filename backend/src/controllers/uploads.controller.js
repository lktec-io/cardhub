import { uploadsService } from '../services/uploads.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const uploadsController = {
  uploadImage: asyncHandler(async (req, res) => {
    const image = await uploadsService.uploadImage(req.file, { purpose: req.body.purpose, userId: req.user.id });
    sendSuccess(res, { statusCode: 201, message: 'Image uploaded', data: { image } });
  }),
};
