'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoExperienceLayer } from './demo/DemoExperienceLayer';

function isChromeLessRoute(pathname: string) {
  return pathname.startsWith('/presenter') || pathname.startsWith('/authority-check');
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const chromeless = isChromeLessRoute(pathname);

  if (chromeless) {
    return (
      <>
        <div className="background-grid" />
        <div className="shell shell-chromeless">
          <main className="content content-chromeless">{children}</main>
        </div>
        <DemoExperienceLayer />
      </>
    );
  }

  return (
    <>
      <div className="background-grid" />
      <div className="shell">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className="content">{children}</main>
        </div>
      </div>
      <DemoExperienceLayer />
    </>
  );
}
