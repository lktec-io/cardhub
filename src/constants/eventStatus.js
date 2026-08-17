export const EVENT_STATUS_META = {
  draft: { label: 'Draft', badgeVariant: 'default' },
  published: { label: 'Published', badgeVariant: 'success' },
  archived: { label: 'Archived', badgeVariant: 'warning' },
};

export function getEventStatusMeta(status) {
  return EVENT_STATUS_META[status] || { label: status, badgeVariant: 'default' };
}
