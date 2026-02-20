'use client';

import Link from 'next/link';
import { Section } from '../Section';
import { markAllNotificationsRead, markNotificationRead } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { localizeNotificationBody, localizeNotificationTitle, t } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function groupLabel(locale: Parameters<typeof t>[0], date: string) {
  const now = new Date();
  const dateValue = new Date(date);
  const diffDays = Math.floor((startOfDay(now) - startOfDay(dateValue)) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return t(locale, 'common.today');
  if (diffDays <= 7) return t(locale, 'common.this_week');
  return t(locale, 'common.earlier');
}

export function NotificationsCenter() {
  const state = useDemoState();
  const { locale, t: tt, formatDateTime } = useTranslation();

  const grouped = [...state.notifications]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .reduce<Record<string, typeof state.notifications>>((acc, notification) => {
      const key = groupLabel(locale, notification.createdAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(notification);
      return acc;
    }, {});

  return (
    <Section title={tt('notifications.title')} action={tt('common.unread_count', { count: state.notifications.filter((item) => !item.read).length })}>
      <div className="notifications-head-actions">
        <button type="button" className="wallet-action wallet-action-soft" onClick={() => markAllNotificationsRead()}>
          {tt('notifications.mark_all_read')}
        </button>
      </div>

      {Object.entries(grouped).map(([group, notifications]) => (
        <div key={group} className="notifications-group">
          <h3>{group}</h3>
          <div className="notifications-list">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`notification-card ${notification.read ? '' : 'notification-card-unread'}`}
                onClick={() => markNotificationRead(notification.id)}
              >
                <div>
                  <p className="notification-title">{localizeNotificationTitle(locale, notification.title)}</p>
                  <p className="notification-body">{localizeNotificationBody(locale, notification.body)}</p>
                  <small className="notification-time">{formatDateTime(notification.createdAt)}</small>
                </div>
                {notification.ctaHref ? (
                  <Link
                    href={notification.ctaHref}
                    className="wallet-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      markNotificationRead(notification.id);
                    }}
                  >
                    {notification.ctaLabel ? localizeNotificationTitle(locale, notification.ctaLabel) : tt('common.open')}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ))}

      {state.notifications.length === 0 ? (
        <div className="wallet-empty-card">
          <h3>{tt('notifications.none_title')}</h3>
          <p>{tt('notifications.none_desc')}</p>
        </div>
      ) : null}
    </Section>
  );
}
