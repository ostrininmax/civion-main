'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import type { CivicCardScope, CivicCardTokenResponse } from '../../lib/client-api';
import { appendRecentCheck } from '../../lib/recent-checks';
import { addFailedVerificationAttempt, addVerificationEvent } from '../../lib/storage/demo-store';
import { createBenefitPassToken } from '../../lib/verification-token';
import { t } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';
import { setDemoScenarioToken } from '../../lib/demo/runtime-store';
import { useDemoSelector } from '../../lib/storage/use-demo-state';
import { EmergencyLockControl } from '../security/EmergencyLockControl';

const ROTATION_SECONDS = 30;

function progressCircleOffset(remaining: number) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remaining / ROTATION_SECONDS));
  return circumference - circumference * progress;
}

export function CivicCardTokenPanel({
  initialToken,
  status,
  issuer,
  validityDate,
  openBigScreenByDefault = false
}: {
  initialToken: CivicCardTokenResponse;
  status: 'eligible' | 'not_eligible';
  issuer: string;
  validityDate: string;
  openBigScreenByDefault?: boolean;
}) {
  const router = useRouter();
  const { locale, t: tt, formatDateTime } = useTranslation();
  const security = useDemoSelector((state) => state.accountSecurity);
  const [tokenData, setTokenData] = useState(initialToken);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState(tt('civic.share_proof'));
  const [error, setError] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState<'minimal' | 'extended'>('minimal');
  const [secondsToRotate, setSecondsToRotate] = useState(ROTATION_SECONDS);
  const [lastValidAt, setLastValidAt] = useState(initialToken.issuedAt);
  const [isOnline, setIsOnline] = useState(true);
  const [bigScreenOpen, setBigScreenOpen] = useState(false);
  const isLocked = Boolean(security.isLocked && security.lockedAt);
  const scannerVerifier = t('en', 'civic.scanner', 'Civic Card Scanner');
  const citizenAppVerifier = t('en', 'wallet.verifier_citizen_app', 'Citizen App');
  const minimalDataShown = 'Status + validity only';
  const extendedDataShown = 'Status + validity + issuer';

  const rights = useMemo(
    () =>
      tokenData.scopes
        .map((scope) => {
          if (scope === 'student_discount') return t(locale, 'right.student_discount');
          if (scope === 'trp_valid') return t(locale, 'civic.scope.trp_valid', 'Temporary Residence Permit valid');
          if (scope === 'transport_concession') return t(locale, 'civic.scope.transport_concession', 'Transport concession');
          return scope;
        })
        .filter(Boolean),
    [locale, tokenData.scopes]
  );

  useEffect(() => {
    setCopyLabel(tt('civic.share_proof'));
  }, [tt]);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    void QRCode.toDataURL(tokenData.token, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#132250',
        light: '#ffffff'
      }
    })
      .then((value) => {
        if (!cancelled) {
          setQrDataUrl(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(tt('civic.qr_generation_failed'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tokenData.token, tt]);

  useEffect(() => {
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (openBigScreenByDefault) {
      setBigScreenOpen(true);
    }
  }, [openBigScreenByDefault]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsToRotate((prev) => {
        if (isLocked) return prev;
        if (prev <= 1) {
          const next = createBenefitPassToken({
            scopes: tokenData.scopes,
            ttlSeconds: 120,
            status,
            issuer: privacyMode === 'minimal' ? '' : issuer,
            docType: privacyMode === 'minimal' ? '' : 'BenefitPass'
          });
          setTokenData(next);
          setLastValidAt(next.issuedAt);
          appendRecentCheck({
            verifier: scannerVerifier,
            result: 'Valid',
            dataShown: privacyMode === 'minimal' ? minimalDataShown : extendedDataShown,
            source: 'qr_generated'
          });
          addVerificationEvent({
            verifier: scannerVerifier,
            result: 'valid',
            dataShown: privacyMode === 'minimal' ? minimalDataShown : extendedDataShown
          });
          return ROTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [extendedDataShown, isLocked, issuer, minimalDataShown, privacyMode, scannerVerifier, status, tokenData.scopes]);

  const rotateToken = () => {
    if (isLocked) {
      addFailedVerificationAttempt({
        actor: scannerVerifier,
        reason: t('en', 'verify.reason.account_locked')
      });
      setError(tt('authority.invalid_locked'));
      return;
    }

    const next = createBenefitPassToken({
      scopes: tokenData.scopes,
      ttlSeconds: 120,
      status,
      issuer: privacyMode === 'minimal' ? '' : issuer,
      docType: privacyMode === 'minimal' ? '' : 'BenefitPass'
    });

    setTokenData(next);
    setLastValidAt(next.issuedAt);
    setSecondsToRotate(ROTATION_SECONDS);

    appendRecentCheck({
      verifier: scannerVerifier,
      result: 'Valid',
      dataShown: privacyMode === 'minimal' ? minimalDataShown : extendedDataShown,
      source: 'qr_generated'
    });
    addVerificationEvent({
      verifier: scannerVerifier,
      result: 'valid',
      dataShown: privacyMode === 'minimal' ? minimalDataShown : extendedDataShown
    });
  };

  const ringOffset = progressCircleOffset(secondsToRotate);

  return (
    <div className="civic-token-grid">
      <div className="civic-rights-shell">
        <p className="mono">{tt('civic.active_rights')}</p>
        <div className="civic-rights-list">
          {rights.map((right) => (
            <span key={right} className="civic-right-chip">
              {right}
            </span>
          ))}
        </div>
      </div>

      <div className="civic-offline-card">
        <strong>{isOnline ? tt('civic.online_mode') : tt('civic.offline_mode')}</strong>
        <p>
          {isOnline
            ? tt('civic.online_mode_desc')
            : tt('civic.offline_mode_desc', { date: formatDateTime(lastValidAt) })}
        </p>
      </div>

      <div className="civic-qr-shell" data-tour="civic-qr">
        {isLocked ? (
          <div className="civic-locked-shell">
            <span className="badge badge-critical">{tt('civic.locked_badge')}</span>
            <p>{tt('civic.locked_desc')}</p>
            {security.lockedAt ? <p className="civic-token-meta">{tt('security.locked_since', { date: formatDateTime(security.lockedAt) })}</p> : null}
          </div>
        ) : null}

        <div className="civic-privacy-row">
          <span className="wallet-query-label">{tt('civic.privacy_mode')}</span>
          <label className="wallet-flow-check">
            <input
              type="checkbox"
              checked={privacyMode === 'extended'}
              onChange={(event) => setPrivacyMode(event.target.checked ? 'extended' : 'minimal')}
            />
            <span>{privacyMode === 'minimal' ? tt('civic.privacy_minimal') : tt('civic.privacy_extended')}</span>
          </label>
        </div>

        <div className={`civic-qr-frame ${isLocked ? 'civic-qr-frame-disabled' : ''}`} aria-live="polite">
          {isLocked ? (
            <div className="civic-qr-loading">{tt('civic.qr_disabled')}</div>
          ) : qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={tt('civic.qr_alt')}
              className="civic-qr-image"
              width={360}
              height={360}
              unoptimized
            />
          ) : (
            <div className="civic-qr-loading">{tt('civic.qr_loading')}</div>
          )}
        </div>

        <div className="civic-rotate-row" aria-live="polite">
          <svg width="64" height="64" viewBox="0 0 64 64" className="civic-ring" aria-hidden>
            <circle cx="32" cy="32" r="28" className="civic-ring-track" />
            <circle cx="32" cy="32" r="28" className="civic-ring-progress" style={{ strokeDashoffset: ringOffset }} />
          </svg>
          <div>
            <p className="civic-token-meta">{tt('civic.rotates_every', { seconds: ROTATION_SECONDS })}</p>
            <p className="civic-token-meta">{tt('civic.next_rotation', { seconds: secondsToRotate })}</p>
            <p className="civic-token-meta">{tt('civic.issued', { date: formatDateTime(tokenData.issuedAt) })}</p>
            <p className="civic-token-meta">{tt('civic.expires', { date: formatDateTime(tokenData.expiresAt) })}</p>
          </div>
        </div>

        <div className="civic-token-actions">
          <button type="button" className="wallet-action wallet-action-primary" onClick={rotateToken} disabled={isLocked}>
            {tt('civic.generate_qr')}
          </button>
          <button
            type="button"
            className="wallet-action"
            disabled={isLocked}
            onClick={async () => {
              if (isLocked) {
                addFailedVerificationAttempt({
                  actor: citizenAppVerifier,
                  reason: t('en', 'verify.reason.account_locked')
                });
                setError(tt('authority.invalid_locked'));
                return;
              }
              const shareUrl = `${window.location.origin}/verify?token=${encodeURIComponent(tokenData.token)}`;
              try {
                await navigator.clipboard.writeText(shareUrl);
                setCopyLabel(tt('civic.share_copied'));
                window.setTimeout(() => setCopyLabel(tt('civic.share_proof')), 1500);
                appendRecentCheck({
                  verifier: citizenAppVerifier,
                  result: 'Valid',
                  dataShown: privacyMode === 'minimal' ? minimalDataShown : extendedDataShown,
                  source: 'share_proof'
                });
                addVerificationEvent({
                  verifier: citizenAppVerifier,
                  result: 'valid',
                  dataShown: privacyMode === 'minimal' ? minimalDataShown : extendedDataShown
                });
              } catch {
                setError(tt('civic.clipboard_unavailable'));
              }
            }}
          >
            {copyLabel}
          </button>
          <button type="button" className="wallet-action wallet-action-soft" onClick={() => setBigScreenOpen(true)}>
            {tt('civic.show_big_screen')}
          </button>
          <button
            type="button"
            className="wallet-action wallet-action-soft"
            onClick={() => {
              setDemoScenarioToken(tokenData);
              router.push('/authority-check?mode=police');
            }}
          >
            {tt('civic.authority_demo')}
          </button>
          <EmergencyLockControl compact />
        </div>

        {error ? <p className="wallet-action-error">{error}</p> : null}
      </div>

      <details className="civic-details-shell" open data-tour="verifier-privacy">
        <summary>{tt('civic.what_verifier_sees')}</summary>
        <div className="civic-details-grid">
          <p className="civic-details-row">
            <span>{tt('civic.status')}</span>
            <strong>{status === 'eligible' ? tt('civic.eligible') : tt('civic.not_eligible')}</strong>
          </p>
          <p className="civic-details-row">
            <span>{tt('civic.validity_date')}</span>
            <strong>{validityDate}</strong>
          </p>
          {privacyMode === 'extended' ? (
            <>
              <p className="civic-details-row">
                <span>{tt('civic.issuer')}</span>
                <strong>{issuer}</strong>
              </p>
              <p className="civic-details-row">
                <span>{tt('civic.document_type')}</span>
                <strong>{tt('civic.benefitpass')}</strong>
              </p>
            </>
          ) : null}
          <p className="civic-disclosure-note">
            {tt('civic.disclosure')}
          </p>
        </div>
      </details>

      {bigScreenOpen ? (
        <div className="civic-bigscreen-overlay" onMouseDown={(event) => event.target === event.currentTarget && setBigScreenOpen(false)}>
          <div className="civic-bigscreen-card" role="dialog" aria-modal="true" aria-label={tt('civic.big_qr_aria')}>
            <button type="button" className="wallet-action wallet-action-soft" onClick={() => setBigScreenOpen(false)}>
              {tt('common.close')}
            </button>
            {qrDataUrl ? (
              <Image src={qrDataUrl} alt={tt('civic.large_qr_alt')} className="civic-bigscreen-image" width={720} height={720} unoptimized />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
