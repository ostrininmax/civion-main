'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../lib/i18n/context';
import { useDemoRuntimeState } from '../../lib/demo/use-demo-runtime';
import { pushDemoToast, setDemoScenarioToken, setDemoTravelStatus } from '../../lib/demo/runtime-store';
import { createBenefitPassToken, verifyBenefitPassToken, type BenefitPassTokenResponse } from '../../lib/verification-token';
import { appendRecentCheck } from '../../lib/recent-checks';
import { addFailedVerificationAttempt, addVerificationEvent, updateDemoState } from '../../lib/storage/demo-store';
import { t } from '../../lib/i18n';
import { useDemoSelector } from '../../lib/storage/use-demo-state';

type CheckResult = {
  valid: boolean;
  reason?: string;
};

type AuthorityMode = 'police' | 'border';

function defaultToken() {
  return createBenefitPassToken({
    scopes: ['student_discount', 'trp_valid', 'transport_concession'],
    ttlSeconds: 120,
    status: 'eligible'
  });
}

function formatCountdown(expiresAt: string) {
  const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function makeNotification(idPrefix: string, type: 'security' | 'request', title: string, body: string, href: string, ctaLabel: string) {
  return {
    id: `${idPrefix}_${Math.random().toString(36).slice(2, 10)}`,
    type,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
    ctaHref: href,
    ctaLabel
  };
}

export function AuthorityCheckClient({
  mode = 'police',
  autoScan = false,
  openFullscreenByDefault = false
}: {
  mode?: AuthorityMode;
  autoScan?: boolean;
  openFullscreenByDefault?: boolean;
}) {
  const runtime = useDemoRuntimeState();
  const router = useRouter();
  const { t: tt, formatDateTime } = useTranslation();
  const accountSecurity = useDemoSelector((state) => state.accountSecurity);

  const [tokenData, setTokenData] = useState<BenefitPassTokenResponse>(runtime.lastGeneratedToken ?? defaultToken());
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<CheckResult | null>(null);
  const [logVerification, setLogVerification] = useState(true);
  const [permitExpired, setPermitExpired] = useState(false);
  const [animSuccess, setAnimSuccess] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(tokenData.expiresAt));
  const splitRef = useRef<HTMLDivElement>(null);
  const isLocked = Boolean(accountSecurity.isLocked && accountSecurity.lockedAt);

  const verification = useMemo(() => verifyBenefitPassToken(tokenData.token), [tokenData.token]);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(tokenData.token, {
      width: 460,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#10203d',
        light: '#ffffff'
      }
    }).then((value) => {
      if (!cancelled) setQrDataUrl(value);
    });

    return () => {
      cancelled = true;
    };
  }, [tokenData.token]);

  useEffect(() => {
    if (!runtime.lastGeneratedToken) return;
    setTokenData(runtime.lastGeneratedToken);
  }, [runtime.lastGeneratedToken]);

  useEffect(() => {
    if (mode === 'border' && runtime.travelStatus === 'idle') {
      setDemoTravelStatus('in_progress');
    }
  }, [mode, runtime.travelStatus]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(formatCountdown(tokenData.expiresAt));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [tokenData.expiresAt]);

  const openFullscreen = async () => {
    if (!splitRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await splitRef.current.requestFullscreen();
  };

  useEffect(() => {
    if (!openFullscreenByDefault) return;
    void openFullscreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFullscreenByDefault]);

  const handleScan = () => {
    if (isLocked) {
      if (mode === 'border') {
        setDemoTravelStatus('needs_proof');
      }
      setScanResult({
        valid: false,
        reason: tt('authority.invalid_locked')
      });

      if (logVerification) {
        addFailedVerificationAttempt({
          actor: mode === 'border' ? 'Border Checkpoint' : 'Police',
          reason: t('en', 'verify.reason.account_locked')
        });
        appendRecentCheck({
          verifier: mode === 'border' ? 'Border Checkpoint' : 'Police',
          result: 'Invalid',
          dataShown: t('en', 'verify.reason.account_locked'),
          source: 'mock'
        });
      }

      pushDemoToast(tt('authority.invalid_locked'));
      return;
    }

    const tokenCheck = verifyBenefitPassToken(tokenData.token);
    const expiredToken = !tokenCheck.valid || tokenCheck.reason === 'expired';
    const valid = !expiredToken && !permitExpired;

    setScanResult({
      valid,
      reason: valid ? undefined : permitExpired ? tt('authority.invalid_permit') : tt('authority.invalid_token')
    });

    if (!valid) {
      if (mode === 'border') {
        setDemoTravelStatus('needs_proof');
      }
      if (logVerification) {
        addVerificationEvent({
          verifier: 'Police',
          result: 'invalid',
          dataShown: 'Status + validity only'
        });
        appendRecentCheck({
          verifier: 'Police',
          result: 'Invalid',
          dataShown: 'Status + validity only',
          source: 'mock'
        });
      }
      pushDemoToast(tt('authority.toast_invalid'));
      return;
    }

    setAnimSuccess(true);
    window.setTimeout(() => setAnimSuccess(false), 900);

    if (mode === 'border') {
      setDemoTravelStatus('cleared');
    }

    if (logVerification) {
      addVerificationEvent({
        verifier: mode === 'border' ? 'Border Checkpoint' : 'Police',
        result: 'valid',
        dataShown: 'Status + validity only'
      });
      appendRecentCheck({
        verifier: mode === 'border' ? 'Border Checkpoint' : 'Police',
        result: 'Valid',
        dataShown: 'Status + validity only',
        source: 'mock'
      });

      updateDemoState((prev) => {
        prev.notifications.unshift(
          mode === 'border'
            ? makeNotification(
                'ntf',
                'request',
                t('en', 'demo.notification.border_cleared_title'),
                t('en', 'demo.notification.border_cleared_body'),
                '/timeline',
                t('en', 'notification.view_timeline')
              )
            : makeNotification(
                'ntf',
                'security',
                t('en', 'demo.notification.police_verified_title'),
                t('en', 'demo.notification.police_verified_body'),
                '/timeline',
                t('en', 'notification.view_timeline')
              )
        );

        const requestId = prev.requests[0]?.id ?? 'req_trp_1';
        prev.requestTimeline.unshift({
          id: `rtl_${Math.random().toString(36).slice(2, 9)}`,
          requestId,
          status: 'in_review',
          title: 'Verification event logged',
          at: new Date().toISOString()
        });

        prev.requestTimeline = prev.requestTimeline.slice(0, 120);
        prev.notifications = prev.notifications.slice(0, 80);
        return prev;
      });
    }

    pushDemoToast(tt('authority.toast_valid'));
  };

  useEffect(() => {
    if (!autoScan) return;
    const timer = window.setTimeout(() => {
      handleScan();
    }, 550);
    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, tokenData.token, permitExpired]);

  const generateNewToken = () => {
    const next = createBenefitPassToken({
      scopes: ['student_discount', 'trp_valid', 'transport_concession'],
      ttlSeconds: 120,
      status: permitExpired ? 'not_eligible' : 'eligible'
    });
    setTokenData(next);
    setDemoScenarioToken(next);
    setScanResult(null);
    pushDemoToast(tt('civic.generate_qr'));
  };

  const simulateExpiredToken = () => {
    const issued = new Date(Date.now() - 4 * 60 * 1000);
    const expired = new Date(Date.now() - 60 * 1000);
    const expiredToken = createBenefitPassToken({
      scopes: ['student_discount', 'trp_valid'],
      ttlSeconds: 30,
      status: permitExpired ? 'not_eligible' : 'eligible'
    });

    setTokenData({
      ...expiredToken,
      issuedAt: issued.toISOString(),
      expiresAt: expired.toISOString()
    });
    setScanResult(null);
    pushDemoToast(tt('authority.simulated_expired_token'));
  };

  const simulateExpiredPermit = () => {
    setPermitExpired(true);
    updateDemoState((prev) => {
      const permit = prev.documents.find((item) => item.id === 'doc-residence');
      if (permit) {
        permit.expiryDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        permit.lastUpdated = new Date().toISOString();
      }
      return prev;
    });
    pushDemoToast(tt('authority.simulated_expired_permit'));
  };

  const travelLabel = runtime.travelStatus === 'idle'
    ? tt('authority.travel_idle')
    : runtime.travelStatus === 'in_progress'
      ? tt('authority.travel_in_progress')
      : runtime.travelStatus === 'cleared'
        ? tt('authority.travel_cleared')
        : tt('authority.travel_needs_proof');

  return (
    <section className="authority-layout" ref={splitRef}>
      <header className="authority-head card">
        <div>
          <p className="wallet-stat-label">{mode === 'border' ? tt('authority.border_mode') : tt('authority.police_mode')}</p>
          <h2>{tt('authority.title')}</h2>
          <p>{tt('authority.subtitle')}</p>
        </div>
        <div className="authority-head-actions">
          <button type="button" className="wallet-action" onClick={() => router.push('/civic-card')}>
            {tt('verify.back_to_card')}
          </button>
          <button type="button" className="wallet-action wallet-action-soft" onClick={openFullscreen}>
            {tt('authority.fullscreen')}
          </button>
        </div>
      </header>

      <div className="authority-split">
        <article className="card authority-citizen-panel">
          <p className="wallet-stat-label">{tt('authority.citizen_panel')}</p>
          <h3>{tt('authority.citizen_title')}</h3>
          <p>{tt('civic.one_sentence')}</p>
          <div className="authority-qr-frame">
            {qrDataUrl ? <Image src={qrDataUrl} alt={tt('civic.qr_alt')} width={460} height={460} unoptimized /> : null}
          </div>
          <p className="civic-token-meta">{tt('verify.expiration_timer', { label: countdown })}</p>
          <p className="civic-token-meta">{tt('civic.issued', { date: formatDateTime(tokenData.issuedAt) })}</p>
          <p className="civic-token-meta">{tt('civic.expires', { date: formatDateTime(tokenData.expiresAt) })}</p>
          {mode === 'border' ? <p className="authority-travel-status">{tt('authority.travel_status', { status: travelLabel })}</p> : null}
        </article>

        <article className="card authority-officer-panel">
          <p className="wallet-stat-label">{tt('authority.officer_panel')}</p>
          <h3>{tt('authority.officer_title')}</h3>
          <p>{tt('authority.officer_hint')}</p>

          <label className="wallet-flow-check">
            <input type="checkbox" checked={logVerification} onChange={(event) => setLogVerification(event.target.checked)} />
            <span>{tt('authority.log_toggle')}</span>
          </label>

          <div className="authority-actions-grid">
            <button type="button" className="wallet-action wallet-action-primary" onClick={handleScan}>
              {tt('authority.scan_qr')}
            </button>
            <button type="button" className="wallet-action" onClick={generateNewToken} disabled={isLocked}>
              {tt('civic.generate_qr')}
            </button>
            <button type="button" className="wallet-action wallet-action-soft" onClick={simulateExpiredToken} disabled={isLocked}>
              {tt('authority.simulate_expired_token')}
            </button>
            <button type="button" className="wallet-action wallet-action-soft" onClick={simulateExpiredPermit} disabled={isLocked}>
              {tt('authority.simulate_expired_permit')}
            </button>
          </div>

          <div className={`authority-result-card ${scanResult?.valid ? 'authority-result-valid' : scanResult ? 'authority-result-invalid' : ''}`}>
            <div className="authority-result-head">
              <strong>{scanResult ? (scanResult.valid ? tt('status.valid') : tt('status.invalid')) : tt('authority.waiting_scan')}</strong>
              {animSuccess ? <span className="authority-success-check">✓</span> : null}
            </div>
            {isLocked ? (
              <>
                <p>{tt('verify.locked_desc')}</p>
                {accountSecurity.lockedAt ? <p>{tt('verify.locked_at', { date: formatDateTime(accountSecurity.lockedAt) })}</p> : null}
                <p className="civic-disclosure-note">{tt('authority.minimal_statement')}</p>
              </>
            ) : (
              <>
                <p>{tt('authority.status_label', { value: permitExpired ? tt('civic.not_eligible') : tt('civic.eligible') })}</p>
                <p>{tt('authority.validity_label', { value: tokenData.expiresAt.slice(0, 10) })}</p>
                <p>{tt('authority.issuer_label', { value: verification.issuer ?? tt('verify.unknown_issuer') })}</p>
                <p className="civic-disclosure-note">{tt('authority.minimal_statement')}</p>
              </>
            )}
            {scanResult?.reason ? <p className="civic-verify-reason">{scanResult.reason}</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
