'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { formatDateValue, localizeNotificationBody, localizeNotificationTitle } from '../lib/i18n';
import { useTranslation } from '../lib/i18n/context';
import { markNotificationRead } from '../lib/storage/demo-store';
import type { AppNotification } from '../lib/models/types';
import { useDemoSelector } from '../lib/storage/use-demo-state';
import { LanguageSwitcher } from './LanguageSwitcher';

function sameNotifications(prev: AppNotification[], next: AppNotification[]) {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let index = 0; index < prev.length; index += 1) {
    const a = prev[index];
    const b = next[index];
    if (
      a.id !== b.id ||
      a.read !== b.read ||
      a.createdAt !== b.createdAt ||
      a.title !== b.title ||
      a.body !== b.body ||
      a.ctaLabel !== b.ctaLabel ||
      a.ctaHref !== b.ctaHref
    ) {
      return false;
    }
  }

  return true;
}

export function Topbar() {
  const [open, setOpen] = useState(false);
  const [todayLabel, setTodayLabel] = useState('');
  const [bellPulse, setBellPulse] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef(0);
  const pathname = usePathname();
  const demoMode = useDemoSelector((state) => state.demoMode);
  const firstName = useDemoSelector((state) => state.profile.fullName.split(' ')[0]);
  const notifications = useDemoSelector((state) => state.notifications, sameNotifications);
  const { locale, t } = useTranslation();

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const topNotifications = useMemo(
    () => [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6),
    [notifications]
  );

  useEffect(() => {
    const updateTodayLabel = () => {
      setTodayLabel(
        formatDateValue(locale, new Date(), {
          weekday: 'short',
          day: '2-digit',
          month: 'short'
        })
      );
    };

    updateTodayLabel();

    const timer = window.setInterval(() => {
      updateTodayLabel();
    }, 60 * 1000);

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [locale]);

  useEffect(() => {
    if (unreadCount > unreadRef.current) {
      setBellPulse(true);
      const timer = window.setTimeout(() => setBellPulse(false), 1100);
      unreadRef.current = unreadCount;
      return () => window.clearTimeout(timer);
    }
    unreadRef.current = unreadCount;
    return undefined;
  }, [unreadCount]);

  return (
    <header className="card hero-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        {demoMode ? <span className="badge demo-header-badge">DEMO</span> : null}
        <h2 style={{ marginTop: 8, fontSize: 32, lineHeight: 1.1 }}>
          {t('topbar.hi_name', { name: firstName })}
        </h2>
      </div>

      <div className="topbar-right">
        <LanguageSwitcher compact />

        <div className="topbar-meta">
          <div className="mono" suppressHydrationWarning>
            {todayLabel || '\u00A0'}
          </div>
          <div style={{ color: 'var(--ink-500)', fontSize: 13, marginTop: 6 }}>{t('topbar.updates')}</div>
        </div>

        <div className="topbar-notifications" ref={menuRef}>
          <button
            type="button"
            className={`topbar-bell-button ${bellPulse ? 'topbar-bell-button-pulse' : ''}`}
            data-tour="notifications-bell"
            aria-label={t('topbar.notifications')}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 3a5 5 0 0 0-5 5v2.38c0 .75-.2 1.48-.58 2.12L5.3 14.4A1.5 1.5 0 0 0 6.58 17h10.84a1.5 1.5 0 0 0 1.28-2.3l-1.12-1.9a4.16 4.16 0 0 1-.58-2.12V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 21Z" />
            </svg>
            {unreadCount > 0 ? (
              <span className="topbar-bell-count" aria-hidden>
                {unreadCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="topbar-notifications-menu" role="menu" aria-label={t('topbar.notifications')}>
              {topNotifications.length === 0 ? (
                <article className="topbar-notification-item" role="menuitem" tabIndex={0}>
                  <p>{t('topbar.no_notifications')}</p>
                </article>
              ) : (
                topNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.ctaHref ?? '/notifications'}
                    className={`topbar-notification-item ${notification.read ? '' : 'topbar-notification-item-unread'}`}
                    role="menuitem"
                    onClick={() => {
                      markNotificationRead(notification.id);
                      setOpen(false);
                    }}
                  >
                    <p>{localizeNotificationTitle(locale, notification.title)}</p>
                    <span>{localizeNotificationBody(locale, notification.body)}</span>
                  </Link>
                ))
              )}
              <Link href="/notifications" className="topbar-notifications-footer" onClick={() => setOpen(false)}>
                {pathname === '/notifications' ? t('topbar.notifications_open') : t('topbar.open_notifications')}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
