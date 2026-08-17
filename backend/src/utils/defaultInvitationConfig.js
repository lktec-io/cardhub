import { INVITATION_CONFIG_VERSION } from '../constants/invitationSections.js';
import { DEFAULT_FONT } from '../constants/fonts.js';

/** The config every new event starts with — sensible defaults, no content the customer didn't provide. */
export function buildDefaultInvitationConfig() {
  return {
    version: INVITATION_CONFIG_VERSION,
    sections: [
      { id: 'hero', type: 'hero', enabled: true, order: 0, data: { subtitle: '' } },
      { id: 'details', type: 'details', enabled: true, order: 1, data: {} },
      { id: 'venue', type: 'venue', enabled: true, order: 2, data: {} },
      { id: 'message', type: 'message', enabled: true, order: 3, data: { message: '' } },
      { id: 'hosts', type: 'hosts', enabled: false, order: 4, data: { hosts: [] } },
      { id: 'countdown', type: 'countdown', enabled: false, order: 5, data: {} },
      { id: 'gallery', type: 'gallery', enabled: false, order: 6, data: { images: [] } },
      { id: 'rsvp', type: 'rsvp', enabled: true, order: 7, data: {} },
    ],
    design: {
      colors: null,
      font: DEFAULT_FONT,
      background: { type: 'template', value: null },
      coverImage: null,
    },
  };
}
