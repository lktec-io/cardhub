import { Badge } from '../ui';
import { getEventStatusMeta } from '../../constants/eventStatus';
import { useLanguage } from '../../hooks/useLanguage';

export function EventStatusBadge({ status }) {
  const { t } = useLanguage();
  const meta = getEventStatusMeta(status);
  return <Badge variant={meta.badgeVariant}>{t(`status.${status}`) === `status.${status}` ? meta.label : t(`status.${status}`)}</Badge>;
}
