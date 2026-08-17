import { Badge } from '../ui';
import { getEventStatusMeta } from '../../constants/eventStatus';

export function EventStatusBadge({ status }) {
  const meta = getEventStatusMeta(status);
  return <Badge variant={meta.badgeVariant}>{meta.label}</Badge>;
}
