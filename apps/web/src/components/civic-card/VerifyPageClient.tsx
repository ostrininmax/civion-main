'use client';

import Link from 'next/link';
import { Section } from '../Section';
import { StatusPill } from '../StatusPill';
import { VerifyExpiryTimer } from './VerifyExpiryTimer';
import type { CivicCardVerificationResponse } from '../../lib/api';
import { useTranslation } from '../../lib/i18n/context';
import { t } from '../../lib/i18n';

const scopeLabelKey = {
  student_discount: 'right.student_discount',
  trp_valid: 'civic.scope.trp_valid',
  transport_concession: 'civic.scope.transport_concession'
} as const;

export function VerifyPageClient({
  token,
  verification
}: {
  token: string;
  verification: CivicCardVerificationResponse | null;
}) {
  const { locale, t: tt } = useTranslation();
  const isValid = Boolean(verification?.valid);

  return (
    <Section title={tt('verify.title')} action={tt('verify.action')}>
      {!token ? (
        <div className="wallet-empty-card">
          <h3>{tt('verify.token_required')}</h3>
          <p>{tt('verify.token_required_desc')}</p>
        </div>
      ) : null}

      {token && !verification ? (
        <div className="wallet-empty-card">
          <h3>{tt('verify.unavailable')}</h3>
          <p>{tt('verify.unavailable_desc')}</p>
        </div>
      ) : null}

      {token && verification ? (
        <div className="civic-verify-shell">
          <div className="civic-verify-status">
            <StatusPill label={isValid ? tt('status.valid') : tt('status.invalid')} tone={isValid ? 'success' : 'critical'} />
            {!isValid && verification.reason ? <p className="civic-verify-reason">{tt('verify.reason', { reason: verification.reason })}</p> : null}
          </div>

          {verification.expiresAt ? <VerifyExpiryTimer expiresAt={verification.expiresAt} /> : null}

          <div className="civic-verify-claims">
            <p className="civic-details-row">
              <span>{tt('civic.status')}</span>
              <strong>{verification.status === 'eligible' ? tt('civic.eligible') : tt('civic.not_eligible')}</strong>
            </p>
            <p className="civic-details-row">
              <span>{tt('civic.issuer')}</span>
              <strong>{verification.issuer ?? tt('verify.unknown_issuer')}</strong>
            </p>
            <p className="civic-details-row">
              <span>{tt('civic.validity_date')}</span>
              <strong>{verification.expiresAt ? verification.expiresAt.slice(0, 10) : tt('common.na')}</strong>
            </p>
            <div className="civic-verify-rights">
              {(verification.scopes ?? []).map((scope) => (
                <span className="civic-right-chip" key={scope}>
                  {t(locale, scopeLabelKey[scope] ?? '', scope)}
                </span>
              ))}
            </div>
            <p className="civic-disclosure-note">{tt('verify.profile_min')}</p>
          </div>

          <Link href="/civic-card" className="section-action-link">
            {tt('verify.back_to_card')}
          </Link>
        </div>
      ) : null}
    </Section>
  );
}

