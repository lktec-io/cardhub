/** Allowlisted sort options for GET /events — never expose raw column sorting to clients. */
export const EVENT_SORT_OPTIONS = {
  recent: 'updated_at DESC',
  newest: 'created_at DESC',
  upcoming: 'event_date ASC',
};

export const DEFAULT_EVENT_SORT = 'recent';
