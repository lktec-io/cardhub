import { getEventTypeLabel } from '../constants/eventTypes';

/** Builds a share message from real event data — never a hardcoded customer name. */
export function buildShareMessage(event, url) {
  const heading = event.hostName || event.title;
  return `You're invited to ${heading}'s ${getEventTypeLabel(event.eventType).toLowerCase()}!\n\nView the invitation:\n${url}`;
}

export function buildWhatsAppShareUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
