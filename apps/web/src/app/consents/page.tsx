'use client';

import { Section } from '../../components/Section';
import { setConsentConnected } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { t } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

function consentLabel(locale: Parameters<typeof t>[0], name: string) {
  if (name === 'Population Registry') return t(locale, 'consent.population_registry', name);
  if (name === 'Tax Registry') return t(locale, 'consent.tax_registry', name);
  if (name === 'Education Registry') return t(locale, 'consent.education_registry', name);
  return name;
}

function consentScope(locale: Parameters<typeof t>[0], scope: string) {
  if (scope === 'Identity + residency status') return t(locale, 'consent.scope_identity_residency', scope);
  if (scope === 'Tax profile status') return t(locale, 'consent.scope_tax_profile', scope);
  if (scope === 'Student status') return t(locale, 'consent.scope_student', scope);
  return scope;
}

export default function ConsentsPage() {
  const state = useDemoState();
  const { locale, t: tt, formatDateTime } = useTranslation();

  return (
    <Section title={tt('consents.title')} action={tt('consents.action')}>
      <div className="settings-grid">
        {state.consents.map((consent) => (
          <article key={consent.id} className="settings-card">
            <div className="badge">{consentLabel(locale, consent.name)}</div>
            <p className="settings-text">{tt('consents.scope', { scope: consentScope(locale, consent.scope) })}</p>
            <p className="wallet-log-meta">{tt('consents.last_sync', { date: formatDateTime(consent.lastSyncAt) })}</p>
            <label className="wallet-flow-check">
              <input
                type="checkbox"
                checked={consent.connected}
                onChange={(event) => setConsentConnected(consent.id, event.target.checked)}
              />
              <span>{consent.connected ? tt('consents.connected') : tt('consents.revoked')}</span>
            </label>
          </article>
        ))}
      </div>
    </Section>
  );
}
