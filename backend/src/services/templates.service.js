import { ApiError } from '../utils/ApiError.js';
import { templateRepository } from '../repositories/template.repository.js';
import { toPublicTemplate } from '../utils/serializeEvent.js';
import { escapeLike } from '../utils/escapeLike.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

export const templatesService = {
  async list({ category, search, page, limit }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await templateRepository.findActivePaginated({
      category,
      search: search ? escapeLike(search) : undefined,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      templates: rows.map(toPublicTemplate),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async getById(id) {
    const template = await templateRepository.findById(id);
    if (!template) {
      throw ApiError.notFound('Template not found');
    }
    return toPublicTemplate(template);
  },

  /** Used internally by the events service — only active templates may be selected. */
  async assertSelectable(id) {
    const template = await templateRepository.findActiveById(id);
    if (!template) {
      throw ApiError.badRequest('The selected template is not available');
    }
    return template;
  },
};
