import Link from 'next/link';
import type { DerivedRight } from '../../lib/wallet-rights';
import { t, ti } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

export function ActiveRightsCard({ rights }: { rights: DerivedRight[] }) {
  const state = useDemoState();
  const activeRights = rights.filter((item) => item.active).sort((a, b) => a.label.localeCompare(b.label));
  const inactiveRights = rights.filter((item) => !item.active).sort((a, b) => a.label.localeCompare(b.label));
  const sample = [...activeRights.slice(0, 2), ...inactiveRights.slice(0, 1), ...activeRights.slice(2)].slice(0, 3);
  const activeCount = rights.filter((item) => item.active).length;

  return (
    <article className="card wallet-rights-card">
      <div className="wallet-rights-head">
        <div>
          <p className="wallet-stat-label">{t(state.locale, 'wallet.active_rights')}</p>
          <h3>{ti(state.locale, 'wallet.active_rights_count', { count: activeCount })}</h3>
        </div>
        <Link href="/civic-card" className="wallet-action wallet-action-primary">
          {t(state.locale, 'wallet.open_civic_card')}
        </Link>
      </div>
      <div className="wallet-rights-chips">
        {sample.length === 0 ? (
          <span className="wallet-right-chip wallet-right-chip-muted" title={t(state.locale, 'wallet.no_rights')}>
            {t(state.locale, 'wallet.no_rights')}
          </span>
        ) : (
          sample.map((right) => (
            <span
              key={right.id}
              className={`wallet-right-chip ${right.active ? '' : 'wallet-right-chip-muted'}`}
              title={right.active ? undefined : right.reason ?? t(state.locale, 'wallet.document_expired')}
            >
              {right.label}
            </span>
          ))
        )}
      </div>
    </article>
  );
}
