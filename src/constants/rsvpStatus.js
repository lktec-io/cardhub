export const RSVP_STATUS_META = {
  pending: { label: 'Pending', badgeVariant: 'default' },
  attending: { label: 'Attending', badgeVariant: 'success' },
  declined: { label: 'Declined', badgeVariant: 'danger' },
};

export function getRsvpStatusMeta(status) {
  return RSVP_STATUS_META[status] || { label: status, badgeVariant: 'default' };
}

export const RSVP_STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'attending', label: 'Attending' },
  { value: 'declined', label: 'Declined' },
];

export const RSVP_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'attending', label: 'Attending' },
  { value: 'declined', label: 'Declined' },
];
