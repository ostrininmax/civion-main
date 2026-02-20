import { Section } from '../../components/Section';
import { getIntegrationHealth, getIntegrationOverview } from '../../lib/api';
import { normalizeLocale, t } from '../../lib/i18n';

function readLocale(searchParams?: { lang?: string | string[] }) {
  const candidate = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang;
  return normalizeLocale(candidate);
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { lang?: string | string[] };
}) {
  const locale = readLocale(searchParams);
  const [overview, health] = await Promise.all([getIntegrationOverview(), getIntegrationHealth()]);

  return (
    <>
      <Section title={t(locale, 'admin.console_title')} action={t(locale, 'admin.console_action')}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t(locale, 'admin.endpoint')}</th>
                <th className="mobile-hide">{t(locale, 'admin.purpose')}</th>
                <th>{t(locale, 'admin.status')}</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.endpoints ?? []).length === 0 ? (
                <tr>
                  <td>/integrations/overview</td>
                  <td className="mobile-hide">{t(locale, 'admin.api_unavailable')}</td>
                  <td>{t(locale, 'admin.blocked')}</td>
                </tr>
              ) : (
                overview!.endpoints.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td>{endpoint.path}</td>
                    <td className="mobile-hide">{endpoint.name}</td>
                    <td>{overview?.status ?? t(locale, 'admin.ready')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title={t(locale, 'admin.system_health')} action={t(locale, 'admin.system_health_action')}>
        <div className="grid-3">
          {(health?.services ?? []).length === 0 ? (
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <div className="badge">{t(locale, 'admin.integration_api')}</div>
              <p style={{ marginTop: 10 }}>{t(locale, 'admin.unavailable')}</p>
            </div>
          ) : (
            health!.services.map((service) => (
              <div className="card" key={service.name} style={{ background: 'var(--surface-2)' }}>
                <div className="badge">{service.name}</div>
                <p style={{ marginTop: 10 }}>{service.status}</p>
              </div>
            ))
          )}
        </div>
      </Section>
    </>
  );
}
