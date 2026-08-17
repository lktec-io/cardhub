import { Badge } from '../ui';
import { getRsvpStatusMeta } from '../../constants/rsvpStatus';

export function GuestStatusBadge({ status }) {
  const meta = getRsvpStatusMeta(status);
  return <Badge variant={meta.badgeVariant}>{meta.label}</Badge>;
}
