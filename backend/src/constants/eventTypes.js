/**
 * Centralized event type allowlist. Stored as VARCHAR (not a DB ENUM) on
 * `events.event_type` on purpose — adding a new type only means editing
 * this file, no migration required.
 */
export const EVENT_TYPES = [
  'wedding',
  'birthday',
  'graduation',
  'anniversary',
  'send_off',
  'baby_shower',
  'party',
  'corporate',
  'other',
];
