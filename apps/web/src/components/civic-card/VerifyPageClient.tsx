'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { Section } from '../Section';
import { StatusPill } from '../StatusPill';
import { VerifyExpiryTimer } from './VerifyExpiryTimer';
import type { CivicCardVerificationResponse } from '../../lib/api';
import { useTranslation } from '../../lib/i18n/context';
import { t } from '../../lib/i18n';
import { useDemoSelector } from '../../lib/storage/use-demo-state';
import { addFailedVerificationAttempt, addVerificationEvent } from '../../lib/storage/demo-store';

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
  const { locale, t: tt, formatDateTime } = useTranslation();
  const accountSecurity = useDemoSelector((state) => state.accountSecurity);
  const hasLoggedBlockedAttemptRef = useRef(false);
  const hasLoggedVerificationRef = useRef(false);
  const isBlockedByLock = Boolean(token && accountSecurity.isLocked && accountSecurity.lockedAt);
  const effectiveVerification = useMemo<CivicCardVerificationResponse | null>(
    () =>
      isBlockedByLock
        ? {
            valid: false,
            reason: 'account_locked'
          }
        : verification,
    [isBlockedByLock, verification]
  );

  useEffect(() => {
    if (!isBlockedByLock || hasLoggedBlockedAttemptRef.current) return;
    hasLoggedBlockedAttemptRef.current = true;
    addFailedVerificationAttempt({
      actor: 'Cyprus Services Portal',
      reason: t('en', 'verify.reason.account_locked')
    });
  }, [isBlockedByLock]);

  useEffect(() => {
    if (!token || !effectiveVerification || hasLoggedVerificationRef.current) return;
    hasLoggedVerificationRef.current = true;

    addVerificationEvent({
      verifier: 'Cyprus Services Portal',
      result: effectiveVerification.valid ? 'valid' : effectiveVerification.reason === 'account_locked' ? 'blocked' : 'invalid',
      dataShown: effectiveVerification.valid ? 'Status + validity only' : effectiveVerification.reason ?? 'Verification failed',
      tokenStatus: effectiveVerification.valid
        ? 'valid'
        : effectiveVerification.reason === 'expired'
          ? 'expired'
          : effectiveVerification.reason === 'account_locked'
            ? 'blocked'
            : 'invalid',
      lockState: isBlockedByLock ? 'locked' : 'unlocked',
      initiatedBy: 'system'
    });
  }, [effectiveVerification, isBlockedByLock, token]);

  const isValid = Boolean(effectiveVerification?.valid);

  const reasonLabel = effectiveVerification?.reason
    ? effectiveVerification.reason === 'account_locked'
      ? tt('verify.reason.account_locked')
      : effectiveVerification.reason
    : '';

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

      {token && effectiveVerification ? (
        <div className="civic-verify-shell" data-tour="verify-result-card">
          <div className="civic-verify-status">
            <StatusPill label={isValid ? tt('status.valid') : tt('status.invalid')} tone={isValid ? 'success' : 'critical'} />
            {!isValid && effectiveVerification.reason ? <p className="civic-verify-reason">{tt('verify.reason', { reason: reasonLabel })}</p> : null}
          </div>

          {effectiveVerification.expiresAt ? <VerifyExpiryTimer expiresAt={effectiveVerification.expiresAt} /> : null}

          {isBlockedByLock ? (
            <div className="wallet-empty-card">
              <h3>{tt('verify.locked_title')}</h3>
              <p>{tt('verify.locked_desc')}</p>
              {accountSecurity.lockedAt ? (
                <p className="wallet-action-meta">{tt('verify.locked_at', { date: formatDateTime(accountSecurity.lockedAt) })}</p>
              ) : null}
              <p className="civic-disclosure-note">{tt('authority.minimal_statement')}</p>
            </div>
          ) : (
            <div className="civic-verify-claims">
              <p className="civic-details-row">
                <span>{tt('civic.status')}</span>
                <strong>{effectiveVerification.status === 'eligible' ? tt('civic.eligible') : tt('civic.not_eligible')}</strong>
              </p>
              <p className="civic-details-row">
                <span>{tt('civic.issuer')}</span>
                <strong>{effectiveVerification.issuer ?? tt('verify.unknown_issuer')}</strong>
              </p>
              <p className="civic-details-row">
                <span>{tt('civic.validity_date')}</span>
                <strong>{effectiveVerification.expiresAt ? effectiveVerification.expiresAt.slice(0, 10) : tt('common.na')}</strong>
              </p>
              <div className="civic-verify-rights">
                {(effectiveVerification.scopes ?? []).map((scope) => (
                  <span className="civic-right-chip" key={scope}>
                    {t(locale, scopeLabelKey[scope] ?? '', scope)}
                  </span>
                ))}
              </div>
              <p className="civic-disclosure-note">{tt('verify.profile_min')}</p>
            </div>
          )}

          <Link href="/civic-card" className="section-action-link">
            {tt('verify.back_to_card')}
          </Link>
        </div>
      ) : null}
    </Section>
  );
}
