export const RSVP_STATUS = {
  PENDING: 'pending',
  ATTENDING: 'attending',
  DECLINED: 'declined',
};

export const RSVP_STATUS_VALUES = Object.values(RSVP_STATUS);

/** Statuses a guest can actively choose when responding — "pending" is only ever a default, never a submitted choice. */
export const RSVP_RESPONSE_VALUES = [RSVP_STATUS.ATTENDING, RSVP_STATUS.DECLINED];
