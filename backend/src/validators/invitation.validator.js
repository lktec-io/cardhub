import { ApiError } from '../utils/ApiError.js';
import { isSafeImageUrl } from '../utils/safeImageUrl.js';
import {
  SECTION_TYPES,
  INVITATION_CONFIG_VERSION,
  MAX_SECTIONS,
  MAX_HOSTS,
  MAX_GALLERY_IMAGES,
  MAX_MESSAGE_LENGTH,
  MAX_SUBTITLE_LENGTH,
  MAX_CONFIG_BYTES,
} from '../constants/invitationSections.js';
import { FONT_OPTIONS } from '../constants/fonts.js';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function fail(field, message) {
  throw ApiError.validation([{ field, message }]);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value, field, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') fail(field, `${field} must be text`);
  if (value.length > maxLength) fail(field, `${field} must be ${maxLength} characters or fewer`);
  if (/[<>]/.test(value)) fail(field, `${field} cannot contain HTML`);
  return value;
}

function normalizeSectionData(type, data, path) {
  const source = isPlainObject(data) ? data : {};

  switch (type) {
    case 'hero':
      return { subtitle: cleanText(source.subtitle, `${path}.subtitle`, MAX_SUBTITLE_LENGTH) };

    case 'message':
      return { message: cleanText(source.message, `${path}.message`, MAX_MESSAGE_LENGTH) };

    case 'hosts': {
      const hosts = Array.isArray(source.hosts) ? source.hosts : [];
      if (hosts.length > MAX_HOSTS) fail(`${path}.hosts`, `You can list up to ${MAX_HOSTS} hosts`);
      return { hosts: hosts.map((host, i) => cleanText(host, `${path}.hosts[${i}]`, 100)).filter(Boolean) };
    }

    case 'gallery': {
      const images = Array.isArray(source.images) ? source.images : [];
      if (images.length > MAX_GALLERY_IMAGES) {
        fail(`${path}.images`, `You can add up to ${MAX_GALLERY_IMAGES} images`);
      }
      images.forEach((url, i) => {
        if (!isSafeImageUrl(url)) fail(`${path}.images[${i}]`, 'Image must be a valid https image URL');
      });
      return { images };
    }

    case 'details':
    case 'venue':
    case 'countdown':
    case 'rsvp':
    default:
      return {};
  }
}

function normalizeSection(rawSection, index) {
  if (!isPlainObject(rawSection)) fail(`sections[${index}]`, 'Invalid section');

  const { id, type, enabled, order } = rawSection;

  if (!SECTION_TYPES.includes(type)) fail(`sections[${index}].type`, 'Unknown section type');
  if (id !== type) fail(`sections[${index}].id`, 'Section id must match its type');
  if (typeof enabled !== 'boolean') fail(`sections[${index}].enabled`, 'enabled must be true or false');
  if (!Number.isInteger(order) || order < 0 || order > 100) {
    fail(`sections[${index}].order`, 'order must be a whole number between 0 and 100');
  }

  return {
    id,
    type,
    enabled,
    order,
    data: normalizeSectionData(type, rawSection.data, `sections[${index}].data`),
  };
}

function normalizeColors(rawColors) {
  if (rawColors === undefined || rawColors === null) return null;
  if (!isPlainObject(rawColors)) fail('design.colors', 'Invalid colors');

  const { primary, accent } = rawColors;
  if (!HEX_COLOR_RE.test(primary || '')) fail('design.colors.primary', 'Primary color must be a valid hex color');
  if (!HEX_COLOR_RE.test(accent || '')) fail('design.colors.accent', 'Accent color must be a valid hex color');

  return { primary, accent };
}

function normalizeBackground(rawBackground) {
  const source = isPlainObject(rawBackground) ? rawBackground : {};
  const type = source.type;

  if (!['template', 'solid', 'image'].includes(type)) {
    fail('design.background.type', 'Background type must be template, solid, or image');
  }

  if (type === 'solid') {
    if (!HEX_COLOR_RE.test(source.value || '')) {
      fail('design.background.value', 'Background color must be a valid hex color');
    }
    return { type, value: source.value };
  }

  if (type === 'image') {
    if (!isSafeImageUrl(source.value)) {
      fail('design.background.value', 'Background image must be a valid https image URL');
    }
    return { type, value: source.value };
  }

  return { type: 'template', value: null };
}

function normalizeDesign(rawDesign) {
  const source = isPlainObject(rawDesign) ? rawDesign : {};

  const font = source.font ?? undefined;
  if (font !== undefined && !FONT_OPTIONS.includes(font)) {
    fail('design.font', 'Unsupported font');
  }

  let coverImage = null;
  if (source.coverImage !== undefined && source.coverImage !== null) {
    if (!isSafeImageUrl(source.coverImage)) {
      fail('design.coverImage', 'Cover image must be a valid https image URL');
    }
    coverImage = source.coverImage;
  }

  return {
    colors: normalizeColors(source.colors),
    font: font || FONT_OPTIONS[0],
    background: normalizeBackground(source.background),
    coverImage,
  };
}

/**
 * Never trusts the client's JSON structure — rebuilds a clean config
 * object field by field from an allowlist, discarding anything not
 * explicitly recognized here. Throws ApiError.validation on the first
 * problem found.
 */
export function validateAndNormalizeInvitationConfig(payload) {
  if (!isPlainObject(payload)) {
    throw ApiError.badRequest('Invalid invitation configuration');
  }

  const approxSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (approxSize > MAX_CONFIG_BYTES) {
    throw ApiError.badRequest('Invitation configuration is too large');
  }

  if (payload.version !== INVITATION_CONFIG_VERSION) {
    fail('version', `Unsupported configuration version`);
  }

  const rawSections = Array.isArray(payload.sections) ? payload.sections : [];
  if (rawSections.length === 0 || rawSections.length > MAX_SECTIONS) {
    fail('sections', 'Invalid number of sections');
  }

  const sections = rawSections.map(normalizeSection);

  const seenTypes = new Set();
  for (const section of sections) {
    if (seenTypes.has(section.type)) fail('sections', `Duplicate section: ${section.type}`);
    seenTypes.add(section.type);
  }

  return {
    version: INVITATION_CONFIG_VERSION,
    sections,
    design: normalizeDesign(payload.design),
  };
}
