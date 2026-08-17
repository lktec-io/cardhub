import { ApiError } from '../utils/ApiError.js';
import { TEMPLATE_CATEGORIES } from '../constants/templateCategories.js';

export function validateTemplateQuery({ category, search }) {
  const details = [];

  if (category && !TEMPLATE_CATEGORIES.includes(category)) {
    details.push({ field: 'category', message: 'Unknown template category' });
  }
  if (search && (typeof search !== 'string' || search.length > 100)) {
    details.push({ field: 'search', message: 'Search term is too long' });
  }

  if (details.length) {
    throw ApiError.validation(details);
  }
}

export function validateTemplateId(id) {
  if (!/^\d+$/.test(String(id))) {
    throw ApiError.badRequest('Invalid template id');
  }
}
