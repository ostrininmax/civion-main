'use client';

import { Section } from '../Section';
import { CivicCardTokenPanel } from './CivicCardTokenPanel';
import type { CivicCardTokenResponse, WalletDocument } from '../../lib/api';
import { useTranslation } from '../../lib/i18n/context';
import { t } from '../../lib/i18n';

function maskIdNumber(value?: string) {
  if (!value) return '•••• 2734';
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= 4) return '••••';
  return `•••• ${compact.slice(-4)}`;
}

function calcReadinessPercent(documentCount: number) {
  if (documentCount === 0) return 0;
  return Math.min(99, 70 + documentCount * 4);
}

export function CivicCardPageClient({
  documents,
  initialToken,
  openBigScreenByDefault = false
}: {
  documents: WalletDocument[];
  initialToken: CivicCardTokenResponse;
  openBigScreenByDefault?: boolean;
}) {
  const { locale, t: tt } = useTranslation();

  const identityDoc =
    documents.find((item) => item.category === 'residence_permit') ??
    documents.find((item) => item.category === 'passport') ??
    documents[0];

  const name = identityDoc?.metadata?.fullName ?? 'Roman Kochetov';
  const maskedId = maskIdNumber(identityDoc?.metadata?.documentNumber);
  const readiness = calcReadinessPercent(documents.length);
  const validityDate = identityDoc?.expiryDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <Section title={tt('civic.page_title')} action={tt('civic.page_action')}>
      <div className="civic-identity-grid">
        <article className="civic-identity-card">
          <div className="civic-photo-placeholder" aria-hidden>
            <span>{name.slice(0, 1).toUpperCase()}</span>
          </div>
          <div className="civic-identity-meta">
            <h3>{name}</h3>
            <p>{tt('civic.id_number', { value: maskedId })}</p>
            <p>{tt('civic.readiness', { value: readiness })}</p>
          </div>
        </article>
        <article className="civic-summary-card">
          <p className="mono">{tt('civic.summary_badge')}</p>
          <h3>{tt('civic.summary_title')}</h3>
          <p>{tt('civic.summary_desc')}</p>
          <p style={{ marginTop: 8, fontWeight: 600 }}>{tt('civic.one_sentence')}</p>
        </article>
      </div>

      <CivicCardTokenPanel
        initialToken={initialToken}
        status="eligible"
        validityDate={validityDate}
        issuer={`${t(locale, 'issuer.university_of_cyprus')} / ${t(locale, 'issuer.migration_department')}`}
        openBigScreenByDefault={openBigScreenByDefault}
      />
    </Section>
  );
}
