'use client';

import Link from 'next/link';
import { useTranslation } from '../lib/i18n/context';

type Crumb = {
  href?: string;
  label: string;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('common.breadcrumb')} className="breadcrumbs">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="breadcrumbs-item">
            {item.href && !last ? (
              <Link href={item.href} className="breadcrumbs-link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumbs-current" aria-current={last ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {!last ? <span className="breadcrumbs-sep">›</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
