import { publicService } from '../services/public.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const publicController = {
  getInvitation: asyncHandler(async (req, res) => {
    const invitation = await publicService.getInvitationBySlug(req.params.slug);
    sendSuccess(res, { data: { invitation } });
  }),
};
