/**
 * Every section type the invitation renderer understands. Adding a new
 * type means: add it here, add its data-shape validator in
 * validators/invitation.validator.js, and add its renderer on the
 * frontend (components/invitation/InvitationRenderer.jsx) — no schema
 * migration required, since sections live inside events.invitation_config.
 */
export const SECTION_TYPES = ['hero', 'details', 'venue', 'message', 'hosts', 'countdown', 'gallery', 'rsvp'];

export const INVITATION_CONFIG_VERSION = 1;

export const MAX_SECTIONS = 12;
export const MAX_HOSTS = 6;
export const MAX_GALLERY_IMAGES = 6;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_SUBTITLE_LENGTH = 200;

/** Serialized invitation_config must stay under this to keep the API and DB sane. */
export const MAX_CONFIG_BYTES = 20_000;
