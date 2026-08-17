import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiBell, FiCheck } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, EmptyState, Skeleton, Badge } from '../../components/ui';
import { notificationsService } from '../../services/notificationsService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';

const PAGE_SIZE = 20;

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Show the loading state immediately on page change, adjusted during
  // render (not in an effect) — see useTemplateCatalog.js for the same pattern.
  const [lastPage, setLastPage] = useState(page);
  if (lastPage !== page) {
    setLastPage(page);
    if (status !== 'loading') setStatus('loading');
  }

  const fetchNotifications = useCallback(() => {
    notificationsService
      .list({ page, limit: PAGE_SIZE })
      .then((res) => {
        const data = res.data.data;
        setNotifications(data.notifications);
        setPagination(data.pagination);
        setStatus(data.notifications.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }, [page]);

  function load() {
    setStatus('loading');
    fetchNotifications();
  }

  // Initial state is already 'loading'; page changes re-fetch without a
  // synchronous setState in the effect body itself (see fetchNotifications).
  useEffect(fetchNotifications, [fetchNotifications]);

  async function handleMarkRead(notification) {
    if (notification.isRead) return;
    try {
      await notificationsService.markRead(notification.id);
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this notification'));
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true);
    try {
      await notificationsService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not mark notifications as read'));
    } finally {
      setIsMarkingAll(false);
    }
  }

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="ch-notifications-page">
      <Seo title="Notifications" />
      <PageHeader
        eyebrow="Dashboard"
        title="Notifications"
        description="Updates about your events and guest responses."
        actions={
          hasUnread ? (
            <Button variant="secondary" isLoading={isMarkingAll} onClick={handleMarkAllRead}>
              <FiCheck aria-hidden="true" /> Mark all as read
            </Button>
          ) : undefined
        }
      />

      {status === 'loading' && (
        <div className="ch-notifications-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="72px" radius="var(--radius-lg)" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<FiAlertCircle />}
          title="Couldn't load notifications"
          action={
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
      )}

      {status === 'empty' && (
        <EmptyState icon={<FiBell />} title="No notifications yet" description="You'll see updates here when guests respond to your invitations." />
      )}

      {status === 'success' && (
        <>
          <div className="ch-notifications-list">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`ch-notification-row ${notification.isRead ? '' : 'ch-notification-row--unread'}`}
                onClick={() => handleMarkRead(notification)}
              >
                <div className="ch-notification-row__dot" aria-hidden="true" />
                <div className="ch-notification-row__body">
                  <p className="ch-notification-row__title">{notification.title}</p>
                  {notification.message && <p className="ch-notification-row__message">{notification.message}</p>}
                  <p className="ch-notification-row__time">{timeAgo(notification.createdAt)}</p>
                </div>
                {!notification.isRead && <Badge variant="accent">New</Badge>}
              </button>
            ))}
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
