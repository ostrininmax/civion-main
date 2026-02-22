'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '../lib/i18n/context';
import { useDemoSelector } from '../lib/storage/use-demo-state';

type NavItem = {
  href: string;
  key: string;
  matches: string[];
  tourDesktop: string;
  tourMobile: string;
};

const nav: NavItem[] = [
  { href: '/', key: 'nav.feed', matches: ['/'], tourDesktop: 'sidebar-feed', tourMobile: 'mobile-nav-feed' },
  { href: '/wallet', key: 'nav.documents', matches: ['/wallet'], tourDesktop: 'sidebar-documents', tourMobile: 'mobile-nav-documents' },
  {
    href: '/services',
    key: 'nav.services',
    matches: ['/services', '/processes'],
    tourDesktop: 'sidebar-services',
    tourMobile: 'mobile-nav-services'
  },
  { href: '/timeline', key: 'nav.timeline', matches: ['/timeline'], tourDesktop: 'sidebar-timeline', tourMobile: 'mobile-nav-timeline' },
  { href: '/inbox', key: 'nav.inbox', matches: ['/inbox'], tourDesktop: 'sidebar-inbox', tourMobile: 'mobile-nav-inbox' },
  {
    href: '/appointments',
    key: 'nav.appointments',
    matches: ['/appointments'],
    tourDesktop: 'sidebar-appointments',
    tourMobile: 'mobile-nav-appointments'
  },
  {
    href: '/civic-card',
    key: 'nav.civic_card',
    matches: ['/civic-card', '/verify'],
    tourDesktop: 'sidebar-civic-card',
    tourMobile: 'mobile-nav-civic-card'
  },
  {
    href: '/settings',
    key: 'nav.menu',
    matches: ['/settings', '/notifications', '/security', '/consents', '/profile'],
    tourDesktop: 'sidebar-menu',
    tourMobile: 'mobile-nav-menu'
  }
];

function isActive(pathname: string, item: NavItem) {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const demoMode = useDemoSelector((state) => state.demoMode);
  const inboxUnread = useDemoSelector((state) => state.messageThreads.reduce((sum, thread) => sum + thread.unreadCount, 0));
  const { t: tt } = useTranslation();
  const lastTouchNavigationAt = useRef(0);
  const navItems = useMemo(
    () =>
      demoMode
        ? [...nav, { href: '/qa', key: 'nav.qa', matches: ['/qa'], tourDesktop: 'sidebar-qa', tourMobile: 'mobile-nav-qa' }]
        : nav,
    [demoMode]
  );

  useEffect(() => {
    for (const item of navItems) {
      router.prefetch(item.href);
    }
  }, [navItems, router]);

  const navigateMobile = (href: string) => {
    if (pathname === href || pathname.startsWith(`${href}/`)) return;
    router.push(href);
  };

  return (
    <aside className="card app-nav">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="app-nav-desktop">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 12 }}>{tt('app.title')}</h1>
          <p style={{ color: 'var(--ink-500)', marginTop: 8, fontSize: 14 }}>
            {tt('app.subtitle')}
          </p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {navItems.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                data-tour={item.tourDesktop}
              >
                <span>{tt(item.key)}</span>
                {item.href === '/inbox' ? (
                  <span className="sidebar-pill">{inboxUnread}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
      <nav className="app-nav-mobile">
        {navItems.map((item) => {
          const active = isActive(pathname, item);
          return (
            <button
              key={item.href}
              type="button"
              className={`app-nav-mobile-item ${active ? 'app-nav-mobile-item-active' : ''}`}
              data-tour={item.tourMobile}
              aria-current={active ? 'page' : undefined}
              onTouchEnd={(event) => {
                event.preventDefault();
                lastTouchNavigationAt.current = Date.now();
                navigateMobile(item.href);
              }}
              onClick={() => {
                if (Date.now() - lastTouchNavigationAt.current < 450) return;
                navigateMobile(item.href);
              }}
            >
              {tt(item.key)}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
