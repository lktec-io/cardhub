import { api } from './api';

export const uploadsService = {
  /**
   * Authenticated image upload (backend/src/routes/v1/uploads.routes.js).
   * `purpose` is one of 'cover' | 'background' | 'gallery'. When no image
   * storage is connected on the server, this rejects with a clear message
   * rather than pretending the upload worked.
   */
  uploadImage(file, purpose) {
    const form = new FormData();
    form.append('image', file);
    form.append('purpose', purpose);
    return api.post('/uploads/images', form, { timeout: 60000 });
  },
};
