'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoExperienceLayer } from './demo/DemoExperienceLayer';
import { TourOverlay } from './onboarding/TourOverlay';
import { syncSecurityLockExpiry } from '../lib/storage/demo-store';
import { useDemoSelector } from '../lib/storage/use-demo-state';
import { useTranslation } from '../lib/i18n/context';

function isChromeLessRoute(pathname: string) {
  return pathname.startsWith('/presenter') || pathname.startsWith('/authority-check');
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const accountSecurity = useDemoSelector((state) => state.accountSecurity);
  const [showLockFlash, setShowLockFlash] = useState(false);
  const chromeless = isChromeLessRoute(pathname);
  const isLocked = Boolean(accountSecurity.isLocked && accountSecurity.lockedAt);

  useEffect(() => {
    syncSecurityLockExpiry();
    const timer = window.setInterval(() => {
      syncSecurityLockExpiry();
    }, 30 * 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!accountSecurity.lastLockAnimationAt) return;
    setShowLockFlash(true);
    const timer = window.setTimeout(() => setShowLockFlash(false), 860);
    return () => window.clearTimeout(timer);
  }, [accountSecurity.lastLockAnimationAt]);

  const banner = isLocked ? (
    <div className="security-global-banner" role="alert">
      <strong>{accountSecurity.lockType === 'hard' ? t('security.global_banner_hard') : t('security.global_banner')}</strong>
      <Link href="/security" className="section-action-link">
        {t('security.global_banner_action')}
      </Link>
    </div>
  ) : null;

  if (chromeless) {
    return (
      <>
        <div className="background-grid" />
        {showLockFlash ? <div className="security-lock-flash" aria-hidden /> : null}
        <div className="shell shell-chromeless">
          <main className="content content-chromeless">
            {banner}
            {children}
          </main>
        </div>
        <DemoExperienceLayer />
        <TourOverlay />
      </>
    );
  }

  return (
    <>
      <div className="background-grid" />
      {showLockFlash ? <div className="security-lock-flash" aria-hidden /> : null}
      <div className="shell">
        <Sidebar />
        <div className="main">
          {banner}
          <Topbar />
          <main className="content">{children}</main>
        </div>
      </div>
      <DemoExperienceLayer />
      <TourOverlay />
    </>
  );
}
