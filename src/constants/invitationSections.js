import { FiCheckCircle, FiClock, FiHeart, FiImage, FiMapPin, FiMessageCircle, FiUsers, FiCalendar } from 'react-icons/fi';

/**
 * Mirrors backend/src/constants/invitationSections.js. Adding a section
 * type means updating both allowlists plus its renderer in
 * components/invitation/sections/ — no schema migration needed either
 * side, since sections live inside events.invitation_config.
 */
export const SECTION_TYPES = [
  { type: 'hero', label: 'Hero', icon: FiHeart, description: 'Names, subtitle, cover image' },
  { type: 'details', label: 'Event Details', icon: FiCalendar, description: 'Date, time, timezone' },
  { type: 'venue', label: 'Venue', icon: FiMapPin, description: 'Where it’s happening' },
  { type: 'message', label: 'Message', icon: FiMessageCircle, description: 'A personal note to your guests' },
  { type: 'hosts', label: 'Hosts', icon: FiUsers, description: 'Who’s hosting' },
  { type: 'countdown', label: 'Countdown', icon: FiClock, description: 'Days remaining until the event' },
  { type: 'gallery', label: 'Gallery', icon: FiImage, description: 'A few photos (optional)' },
  { type: 'rsvp', label: 'RSVP', icon: FiCheckCircle, description: 'Let guests respond directly on the invitation' },
];

export const INVITATION_CONFIG_VERSION = 1;
export const MAX_HOSTS = 6;
export const MAX_GALLERY_IMAGES = 6;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_SUBTITLE_LENGTH = 200;

export function getSectionMeta(type) {
  return SECTION_TYPES.find((s) => s.type === type);
}
