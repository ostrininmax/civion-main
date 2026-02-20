import { Section } from '../../components/Section';
import { StatusPill } from '../../components/StatusPill';
import { StartServiceButton } from '../../components/actions/StartServiceButton';
import Link from 'next/link';
import { getProcessCatalog, getProcessInstances } from '../../lib/api';
import { getServiceVisual, processStatusTone } from '../../lib/service-ui';
import { localizeServiceEligibility, localizeServiceTitle, normalizeLocale, t, ti } from '../../lib/i18n';

function readLocale(searchParams?: { lang?: string | string[] }) {
  const candidate = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang;
  return normalizeLocale(candidate);
}

function latestStatusByProcess(
  items: Array<{ processId: string; status: 'not_started' | 'in_progress' | 'submitted' | 'completed' }>
) {
  const map = new Map<string, 'not_started' | 'in_progress' | 'submitted' | 'completed'>();
  for (const item of items) {
    if (!map.has(item.processId)) {
      map.set(item.processId, item.status);
    }
  }
  return map;
}

export default async function ProcessesPage({
  searchParams
}: {
  searchParams?: { lang?: string | string[] };
}) {
  const locale = readLocale(searchParams);
  const [catalog, instances] = await Promise.all([getProcessCatalog(), getProcessInstances()]);
  const statusByProcessId = latestStatusByProcess(instances);

  function statusLabel(status: 'not_started' | 'in_progress' | 'submitted' | 'completed') {
    if (status === 'not_started') return t(locale, 'processes.not_started');
    if (status === 'in_progress') return t(locale, 'processes.in_progress');
    if (status === 'submitted') return t(locale, 'processes.submitted');
    return t(locale, 'processes.completed');
  }

  return (
    <Section title={t(locale, 'processes.title')} action={ti(locale, 'processes.action', { count: catalog.length })}>
      <div className="services-board">
        {catalog.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{t(locale, 'processes.catalog_unavailable')}</h3>
            <p>{t(locale, 'processes.catalog_unavailable_desc')}</p>
          </div>
        ) : (
          catalog.map((item) => {
            const status = statusByProcessId.get(item.id) ?? 'not_started';
            const visual = getServiceVisual(item.id, item.name);
            const localizedName = localizeServiceTitle(locale, item.id, item.name);
            const localizedSummary = localizeServiceEligibility(locale, item.id, item.eligibilitySummary);

            return (
              <article key={item.id} className="service-full-card">
                <span className={`service-icon-tile service-icon-${visual.accent}`}>{visual.shortCode}</span>

                <div className="service-full-main">
                  <div className="service-full-head">
                    <Link href={`/processes/${item.id}`} className="service-full-title">
                      {localizedName}
                    </Link>
                    <span className="service-quick-arrow" aria-hidden>
                      ›
                    </span>
                  </div>

                  <p className="service-quick-local">{t(locale, `service.category.${item.category === 'immigration' ? 'migration' : item.category === 'tax' ? 'taxes' : 'business'}`)}</p>
                  <p className="service-full-summary">{localizedSummary}</p>

                  <div className="service-full-meta">
                    <StatusPill label={statusLabel(status)} tone={processStatusTone(status)} />
                    <span className="mono">{ti(locale, 'processes.eta', { days: item.estimatedDays })}</span>
                  </div>
                </div>

                <div className="service-full-actions">
                  {status === 'not_started' ? (
                    <StartServiceButton processId={item.id} />
                  ) : (
                    <Link href={`/processes/${item.id}`} className="wallet-action" style={{ textDecoration: 'none' }}>
                      {t(locale, 'processes.open_flow')}
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </Section>
  );
}
