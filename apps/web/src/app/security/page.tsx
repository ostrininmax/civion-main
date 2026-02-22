'use client';

import { useMemo, useState } from 'react';
import { Section } from '../../components/Section';
import { EmergencyLockControl } from '../../components/security/EmergencyLockControl';
import { localizeAuthority, t, ti } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';
import type { DeviceSession, ShareLink, VerificationEvent } from '../../lib/models/types';
import { computeSecuritySnapshot } from '../../lib/security/security-score';
import {
  extendShareLinkDuration,
  removeTrustedDevice,
  renameDeviceSession,
  resetSecurityEvents,
  revokeAllActiveShareLinks,
  revokeShareLinkById,
  signOutDeviceSession,
  simulateShareLinkLeak,
  simulateSuspiciousLogin,
  simulateUnauthorizedVerificationAttempt,
  trustDeviceSession
} from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { closeModal, openModal, toastError, toastSuccess } from '../../lib/ux-actions';

function localizeShownData(locale: Parameters<typeof t>[0], value: string) {
  if (value === 'Status + validity only') return t(locale, 'wallet.checks_data_status_validity');
  if (value === 'Status + validity + issuer') return t(locale, 'wallet.checks_data_status_validity_issuer');
  if (value === 'Student eligibility + expiry date') return t(locale, 'wallet.checks_data_student_eligibility');
  if (value === 'Identity status + tax id validity') return t(locale, 'wallet.checks_data_identity_tax');
  if (value === 'Unauthorized verification attempt') return t(locale, 'security.unauthorized_attempt');
  if (value === 'Untrusted login detected') return t(locale, 'security.audit_untrusted_login_detected');

  const shareCreatedMatch = value.match(/^Share link created for (.+)$/);
  if (shareCreatedMatch) {
    return ti(locale, 'security.audit_share_created_for', { target: shareCreatedMatch[1] }, value);
  }

  const shareRevokedMatch = value.match(/^Share link revoked for (.+)$/);
  if (shareRevokedMatch) {
    return ti(locale, 'security.audit_share_revoked_for', { target: shareRevokedMatch[1] }, value);
  }

  const revokedCountMatch = value.match(/^Revoked (\d+) active share links$/);
  if (revokedCountMatch) {
    return ti(locale, 'security.audit_revoked_count', { count: revokedCountMatch[1] }, value);
  }

  const shareCreatedType = value.match(/^Share link created \((.+)\)$/);
  if (shareCreatedType) {
    return ti(locale, 'security.audit_share_created_type', { type: shareCreatedType[1] }, value);
  }

  const shareRevokedType = value.match(/^Share link revoked \((.+)\)$/);
  if (shareRevokedType) {
    return ti(locale, 'security.audit_share_revoked_type', { type: shareRevokedType[1] }, value);
  }

  const shareExtendedType = value.match(/^Share link extended \((.+)\)$/);
  if (shareExtendedType) {
    return ti(locale, 'security.audit_share_extended_type', { type: shareExtendedType[1] }, value);
  }

  const deviceTrusted = value.match(/^Device trusted: (.+)$/);
  if (deviceTrusted) {
    return ti(locale, 'security.audit_device_trusted', { device: deviceTrusted[1] }, value);
  }

  const deviceUntrusted = value.match(/^Device trust removed: (.+)$/);
  if (deviceUntrusted) {
    return ti(locale, 'security.audit_device_untrusted', { device: deviceUntrusted[1] }, value);
  }

  const sessionSignedOut = value.match(/^Session signed out: (.+)$/);
  if (sessionSignedOut) {
    return ti(locale, 'security.audit_session_signed_out', { device: sessionSignedOut[1] }, value);
  }
  return value;
}

function securityStatusTone(status: 'protected' | 'attention' | 'risk' | 'locked') {
  if (status === 'protected') return 'security-status-protected';
  if (status === 'attention') return 'security-status-attention';
  return 'security-status-risk';
}

function resultLabelKey(result: VerificationEvent['result']) {
  if (result === 'valid') return 'status.valid';
  if (result === 'blocked') return 'status.blocked';
  return 'status.invalid';
}

function resultBadgeClass(result: VerificationEvent['result']) {
  if (result === 'valid') return 'security-result-valid';
  if (result === 'blocked') return 'security-result-blocked';
  return 'security-result-invalid';
}

function sessionStatusLabelKey(status: DeviceSession['status']) {
  if (status === 'current') return 'security.session_current';
  if (status === 'trusted') return 'security.session_trusted';
  if (status === 'suspicious') return 'security.session_suspicious';
  return 'security.session_new';
}

function shareStatusLabelKey(status: ShareLink['status']) {
  if (status === 'active') return 'security.share_status_active';
  if (status === 'revoked') return 'security.share_status_revoked';
  return 'security.share_status_expired';
}

function deviceTypeKey(type: DeviceSession['deviceType']) {
  if (type === 'phone') return 'security.device_phone';
  if (type === 'tablet') return 'security.device_tablet';
  return 'security.device_laptop';
}

function securityStatusLabelKey(status: 'protected' | 'attention' | 'risk' | 'locked') {
  if (status === 'protected') return 'security.status_protected';
  if (status === 'attention') return 'security.status_attention';
  if (status === 'locked') return 'security.status_locked';
  return 'security.status_risk';
}

function securitySummaryKey(status: 'protected' | 'attention' | 'risk' | 'locked', suspiciousSessions: number) {
  if (status === 'locked') return 'security.summary_locked';
  if (status === 'risk') return 'security.summary_risk';
  if (status === 'attention') {
    return suspiciousSessions > 0 ? 'security.summary_attention_suspicious' : 'security.summary_attention';
  }
  return 'security.summary_protected';
}

function tokenStatusLabelKey(status: VerificationEvent['tokenStatus']) {
  if (status === 'valid') return 'security.token_status_valid';
  if (status === 'invalid') return 'security.token_status_invalid';
  if (status === 'expired') return 'security.token_status_expired';
  if (status === 'blocked') return 'security.token_status_blocked';
  return 'common.na';
}

function lockStateLabelKey(state: VerificationEvent['lockState']) {
  if (state === 'locked') return 'security.lock_state_locked';
  if (state === 'unlocked') return 'security.lock_state_unlocked';
  return 'common.na';
}

function initiatedByLabelKey(value: VerificationEvent['initiatedBy']) {
  if (value === 'user') return 'security.initiated_user';
  if (value === 'system') return 'security.initiated_system';
  return 'common.na';
}

export default function SecurityPage() {
  const state = useDemoState();
  const { locale, t: tt, formatDateTime, formatNumber } = useTranslation();
  const snapshot = useMemo(() => computeSecuritySnapshot(state), [state]);

  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [verificationDetailsId, setVerificationDetailsId] = useState<string | null>(null);
  const [deviceDetailsId, setDeviceDetailsId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const verificationDetails = verificationDetailsId
    ? state.verificationEvents.find((item) => item.id === verificationDetailsId) ?? null
    : null;
  const deviceDetails = deviceDetailsId
    ? state.accountSecurity.deviceSessions.find((item) => item.id === deviceDetailsId) ?? null
    : null;
  const statusClass = securityStatusTone(snapshot.securityState.status);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRecommendationAction = (action: 'review_links' | 'manage_devices' | 'configure_pin' | 'open_verifications' | 'activate_lock') => {
    if (action === 'review_links') {
      scrollTo('security-share-links');
      toastSuccess(tt('security.toast_review_links'));
      return;
    }
    if (action === 'manage_devices') {
      scrollTo('security-sessions');
      toastSuccess(tt('security.toast_review_devices'));
      return;
    }
    if (action === 'configure_pin') {
      scrollTo('security-lock');
      toastSuccess(tt('security.toast_open_lock_settings'));
      return;
    }
    if (action === 'open_verifications') {
      scrollTo('security-verifications');
      toastSuccess(tt('security.toast_open_verifications'));
      return;
    }
    scrollTo('security-lock');
    toastSuccess(tt('security.toast_activate_lock'));
  };

  const copyShareLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toastSuccess(tt('security.toast_link_copied'));
    } catch {
      toastError(tt('security.toast_link_copy_failed'));
    }
  };

  return (
    <>
      <Section title={tt('security.center_title')} action={tt('security.center_action')}>
        <div className={`security-status-card ${statusClass}`}>
          <div className="security-status-main">
            <span className={`badge ${statusClass}`}>{tt(securityStatusLabelKey(snapshot.securityState.status))}</span>
            <h3>{tt('security.score_label', { score: formatNumber(snapshot.securityState.score) })}</h3>
            <p>{tt(securitySummaryKey(snapshot.securityState.status, snapshot.suspiciousSessions.length))}</p>
            <button
              type="button"
              className="section-action-link security-score-link"
              onClick={() => openModal(setScoreModalOpen, 'security.score_open')}
            >
              {tt('security.why_score')}
            </button>
          </div>

          <div className="security-score-ring" aria-hidden>
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="48" className="security-score-track" />
              <circle
                cx="60"
                cy="60"
                r="48"
                className="security-score-progress"
                style={{
                  strokeDashoffset: `${301.59 - (301.59 * snapshot.securityState.score) / 100}px`
                }}
              />
            </svg>
            <strong>{snapshot.securityState.score}</strong>
          </div>
        </div>

        <div className="security-quick-actions">
          <button type="button" className="wallet-action wallet-action-critical" onClick={() => scrollTo('security-lock')}>
            {tt('security.quick_lock')}
          </button>
          <button type="button" className="wallet-action" onClick={() => scrollTo('security-share-links')}>
            {tt('security.quick_review_links')}
          </button>
          <button type="button" className="wallet-action wallet-action-soft" onClick={() => scrollTo('security-devices')}>
            {tt('security.quick_manage_devices')}
          </button>
        </div>
      </Section>

      <Section title={tt('security.recommendations_title')} action={tt('common.total_count', { count: snapshot.recommendations.length })}>
        {snapshot.recommendations.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{tt('security.recommendations_good_title')}</h3>
            <p>{tt('security.recommendations_good_body')}</p>
          </div>
        ) : (
          <div className="security-recommendations-list">
            {snapshot.recommendations.map((recommendation) => (
              <article className="security-recommendation-card" key={recommendation.id}>
                <div>
                  <h3>{tt(recommendation.titleKey)}</h3>
                  <p>{tt(recommendation.bodyKey)}</p>
                </div>
                <button
                  type="button"
                  className="wallet-action"
                  onClick={() => handleRecommendationAction(recommendation.action)}
                >
                  {tt(recommendation.ctaKey)}
                </button>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title={tt('security.signins_title')} action={tt('common.total_count', { count: state.accountSecurity.deviceSessions.length })}>
        <div id="security-sessions" className="security-session-list">
          {state.accountSecurity.deviceSessions.map((session) => (
            <article key={session.id} className="security-session-card">
              <div className="security-session-head">
                <div>
                  <p className="security-session-title">{session.deviceName}</p>
                  <p className="security-session-meta">
                    {tt(deviceTypeKey(session.deviceType))} · {session.location}
                  </p>
                </div>
                <span className={`badge security-session-status-${session.status}`}>{tt(sessionStatusLabelKey(session.status))}</span>
              </div>
              <p className="security-session-meta">
                {tt('security.session_last_seen')}: {formatDateTime(session.lastSeenAt)}
              </p>
              <div className="security-session-actions">
                {session.isTrusted ? (
                  <button
                    type="button"
                    className="wallet-action wallet-action-soft"
                    onClick={() => {
                      const updated = removeTrustedDevice(session.id);
                      if (updated) toastSuccess(tt('security.toast_device_untrusted'));
                    }}
                  >
                    {tt('security.remove_trust')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="wallet-action"
                    onClick={() => {
                      const updated = trustDeviceSession(session.id);
                      if (updated) toastSuccess(tt('security.toast_device_trusted'));
                    }}
                  >
                    {tt('security.mark_trusted')}
                  </button>
                )}
                <button
                  type="button"
                  className="wallet-action wallet-action-soft"
                  onClick={() => {
                    const changed = signOutDeviceSession(session.id);
                    if (changed) {
                      toastSuccess(tt('security.toast_session_signed_out'));
                    } else {
                      toastError(tt('security.toast_session_signout_unavailable'));
                    }
                  }}
                >
                  {tt('security.sign_out_device')}
                </button>
                <button
                  type="button"
                  className="wallet-action wallet-action-soft"
                  onClick={() => {
                    setRenameValue(session.deviceName);
                    setDeviceDetailsId(session.id);
                  }}
                >
                  {tt('security.view_details')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title={tt('security.verifications_title')} action={tt('common.total_count', { count: state.verificationEvents.length })}>
        <div id="security-verifications" className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{tt('security.verifier')}</th>
                <th>{tt('security.result')}</th>
                <th>{tt('security.shown_data')}</th>
                <th className="mobile-hide">{tt('security.time')}</th>
                <th>{tt('common.open')}</th>
              </tr>
            </thead>
            <tbody>
              {state.verificationEvents.slice(0, 10).map((event) => (
                <tr key={event.id}>
                  <td>{localizeAuthority(locale, event.verifier)}</td>
                  <td>
                    <span className={`security-result-pill ${resultBadgeClass(event.result)}`}>{tt(resultLabelKey(event.result))}</span>
                  </td>
                  <td>{localizeShownData(locale, event.dataShown)}</td>
                  <td className="mobile-hide">{formatDateTime(event.at)}</td>
                  <td>
                    <button
                      type="button"
                      className="wallet-action wallet-action-soft"
                      onClick={() => setVerificationDetailsId(event.id)}
                    >
                      {tt('security.view_details')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={tt('security.active_links_title')} action={tt('security.active_links_count', { count: snapshot.activeShareLinks.length })}>
        <div id="security-share-links" className="security-share-links">
          <div className="security-share-actions">
            <button
              type="button"
              className="wallet-action wallet-action-soft"
              onClick={() => {
                const revoked = revokeAllActiveShareLinks();
                if (revoked > 0) {
                  toastSuccess(tt('security.toast_all_links_revoked', { count: revoked }));
                } else {
                  toastError(tt('security.toast_no_active_links'));
                }
              }}
            >
              {tt('security.revoke_all_links')}
            </button>
          </div>

          {snapshot.shareLinks.length === 0 ? (
            <div className="wallet-empty-card">
              <h3>{tt('security.no_links_title')}</h3>
              <p>{tt('security.no_links_desc')}</p>
            </div>
          ) : (
            snapshot.shareLinks.map((link) => (
              <article key={link.id} className="security-share-card">
                <div>
                  <p className="security-share-title">{link.targetTitle ?? tt('security.link_unknown_target')}</p>
                  <p className="security-share-meta">
                    {tt('security.share_created')}: {formatDateTime(link.createdAt)}
                  </p>
                  <p className="security-share-meta">
                    {tt('security.share_expires')}: {formatDateTime(link.expiresAt)}
                  </p>
                  <p className="security-share-meta">
                    {tt('security.share_scope')}:{' '}
                    {link.scope
                      .map((scope) => {
                        if (scope === 'status') return tt('wallet.drawer_share_field_status');
                        if (scope === 'validity') return tt('wallet.drawer_share_field_validity');
                        if (scope === 'issuer') return tt('wallet.drawer_share_field_issuer');
                        if (scope === 'document_type') return tt('wallet.drawer_share_field_document_type');
                        return scope;
                      })
                      .join(', ')}
                  </p>
                  <span className={`badge security-share-status-${link.status}`}>{tt(shareStatusLabelKey(link.status))}</span>
                </div>
                <div className="security-share-card-actions">
                  <button type="button" className="wallet-action wallet-action-soft" onClick={() => void copyShareLink(link.link)}>
                    {tt('security.copy_link')}
                  </button>
                  <button
                    type="button"
                    className="wallet-action wallet-action-soft"
                    disabled={link.status !== 'active'}
                    onClick={() => {
                      const changed = extendShareLinkDuration(link.id, '1h');
                      if (changed) {
                        toastSuccess(tt('security.toast_link_extended'));
                      } else {
                        toastError(tt('security.toast_link_extend_failed'));
                      }
                    }}
                  >
                    {tt('security.extend_link')}
                  </button>
                  <button
                    type="button"
                    className="wallet-action wallet-action-critical"
                    disabled={link.status !== 'active'}
                    onClick={() => {
                      const revoked = revokeShareLinkById(link.id);
                      if (revoked) {
                        toastSuccess(tt('security.toast_link_revoked'));
                      } else {
                        toastError(tt('security.toast_link_revoke_failed'));
                      }
                    }}
                  >
                    {tt('security.revoke_link')}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </Section>

      <Section title={tt('security.emergency_title')} action={tt('security.lock_section_action')}>
        <div id="security-lock" className="security-lock-section">
          <EmergencyLockControl />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{tt('security.event_type')}</th>
                  <th>{tt('security.reason')}</th>
                  <th className="mobile-hide">{tt('security.time')}</th>
                </tr>
              </thead>
              <tbody>
                {state.accountSecurity.lockHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3}>{tt('security.no_lock_history')}</td>
                  </tr>
                ) : (
                  state.accountSecurity.lockHistory.slice(0, 12).map((event) => (
                    <tr key={event.id}>
                      <td>{event.type === 'lock' ? tt('security.event_lock_label') : event.type === 'unlock' ? tt('security.event_unlock') : tt('security.event_auto_unlock')}</td>
                      <td>{event.note ?? tt('common.na')}</td>
                      <td className="mobile-hide">{formatDateTime(event.at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title={tt('security.trusted_devices_title')} action={tt('common.total_count', { count: snapshot.trustedDevices.length })}>
        <div id="security-devices" className="security-trusted-list">
          {snapshot.trustedDevices.length === 0 ? (
            <div className="wallet-empty-card">
              <h3>{tt('security.no_trusted_title')}</h3>
              <p>{tt('security.no_trusted_desc')}</p>
            </div>
          ) : (
            snapshot.trustedDevices.map((device) => (
              <article key={device.id} className="security-trusted-card">
                <h3>{device.deviceName}</h3>
                <p className="settings-text">
                  {tt('security.session_last_seen')}: {formatDateTime(device.lastSeenAt)}
                </p>
                <p className="settings-text">
                  {tt('security.device_added')}: {formatDateTime(device.addedAt ?? device.lastSeenAt)}
                </p>
                <div className="security-session-actions">
                  <button
                    type="button"
                    className="wallet-action wallet-action-soft"
                    onClick={() => {
                      setRenameValue(device.deviceName);
                      setDeviceDetailsId(device.id);
                    }}
                  >
                    {tt('security.rename_device')}
                  </button>
                  <button
                    type="button"
                    className="wallet-action wallet-action-critical"
                    onClick={() => {
                      const changed = removeTrustedDevice(device.id);
                      if (changed) toastSuccess(tt('security.toast_device_untrusted'));
                    }}
                  >
                    {tt('security.remove_trust')}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </Section>

      <Section title={tt('security.failed_checks_title')} action={tt('common.total_count', { count: state.accountSecurity.failedVerificationAttempts.length })}>
        {state.accountSecurity.failedVerificationAttempts.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{tt('security.failed_checks_title')}</h3>
            <p>{tt('security.no_failed_desc')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{tt('security.actor')}</th>
                  <th>{tt('security.reason')}</th>
                  <th className="mobile-hide">{tt('security.time')}</th>
                </tr>
              </thead>
              <tbody>
                {state.accountSecurity.failedVerificationAttempts.slice(0, 12).map((event) => (
                  <tr key={event.id}>
                    <td>{localizeAuthority(locale, event.actor)}</td>
                    <td>{event.reason}</td>
                    <td className="mobile-hide">{formatDateTime(event.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {state.demoMode ? (
        <Section title={tt('security.demo_controls_title')} action={tt('security.demo_controls_action')}>
          <div className="security-demo-controls">
            <button
              type="button"
              className="wallet-action"
              onClick={() => {
                simulateSuspiciousLogin();
                toastSuccess(tt('security.toast_simulated_login'));
              }}
            >
              {tt('security.demo_suspicious_login')}
            </button>
            <button
              type="button"
              className="wallet-action"
              onClick={() => {
                simulateUnauthorizedVerificationAttempt();
                toastSuccess(tt('security.toast_simulated_verification'));
              }}
            >
              {tt('security.demo_unauthorized_verification')}
            </button>
            <button
              type="button"
              className="wallet-action"
              onClick={() => {
                const created = simulateShareLinkLeak();
                if (created) {
                  toastSuccess(tt('security.toast_simulated_link_leak'));
                }
              }}
            >
              {tt('security.demo_share_leak')}
            </button>
            <button
              type="button"
              className="wallet-action wallet-action-soft"
              onClick={() => {
                resetSecurityEvents();
                toastSuccess(tt('security.toast_security_reset'));
              }}
            >
              {tt('security.demo_reset_security')}
            </button>
          </div>
        </Section>
      ) : null}

      {scoreModalOpen ? (
        <div className="wallet-inline-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeModal(setScoreModalOpen, 'security.score_close')}>
          <div className="wallet-inline-modal security-score-modal" role="dialog" aria-modal="true" aria-labelledby="security-score-title">
            <h4 id="security-score-title">{tt('security.why_score')}</h4>
            <div className="security-score-breakdown">
              {snapshot.breakdown.map((item) => (
                <p key={item.id} className={item.applied ? 'security-breakdown-on' : 'security-breakdown-off'}>
                  <span>{tt(item.labelKey)}</span>
                  <strong>{item.applied ? `${item.delta > 0 ? '+' : ''}${item.delta}` : '0'}</strong>
                </p>
              ))}
            </div>
            <div className="wallet-inline-actions">
              <button type="button" className="wallet-action wallet-action-soft" onClick={() => closeModal(setScoreModalOpen, 'security.score_close')}>
                {tt('common.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {verificationDetails ? (
        <div className="wallet-inline-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setVerificationDetailsId(null)}>
          <div className="wallet-inline-modal security-event-modal" role="dialog" aria-modal="true" aria-labelledby="security-event-title">
            <h4 id="security-event-title">{tt('security.verification_details_title')}</h4>
            <p>{tt('security.verifier')}: {localizeAuthority(locale, verificationDetails.verifier)}</p>
            <p>{tt('security.result')}: {tt(resultLabelKey(verificationDetails.result))}</p>
            <p>{tt('security.shown_data')}: {localizeShownData(locale, verificationDetails.dataShown)}</p>
            <p>{tt('security.token_status')}: {tt(tokenStatusLabelKey(verificationDetails.tokenStatus))}</p>
            <p>{tt('security.lock_state')}: {tt(lockStateLabelKey(verificationDetails.lockState))}</p>
            <p>{tt('security.initiated_by')}: {tt(initiatedByLabelKey(verificationDetails.initiatedBy))}</p>
            <p>{tt('security.time')}: {formatDateTime(verificationDetails.at)}</p>
            <p className="settings-text">{tt('security.min_data_desc')}</p>
            <div className="wallet-inline-actions">
              <button type="button" className="wallet-action wallet-action-soft" onClick={() => setVerificationDetailsId(null)}>
                {tt('common.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deviceDetails ? (
        <div className="wallet-inline-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setDeviceDetailsId(null)}>
          <div className="wallet-inline-modal security-device-modal" role="dialog" aria-modal="true" aria-labelledby="security-device-title">
            <h4 id="security-device-title">{tt('security.device_details_title')}</h4>
            <p>{tt('security.session_device')}: {deviceDetails.deviceName}</p>
            <p>{tt('security.session_location')}: {deviceDetails.location}</p>
            <p>{tt('security.ip_masked')}: {deviceDetails.ipMasked ?? tt('common.na')}</p>
            <p>{tt('security.session_last_seen')}: {formatDateTime(deviceDetails.lastSeenAt)}</p>

            <label className="wallet-inline-label" htmlFor="security-device-rename">
              {tt('security.rename_device')}
            </label>
            <input
              id="security-device-rename"
              className="wallet-field"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder={tt('security.rename_placeholder')}
            />

            <div className="wallet-inline-actions">
              <button
                type="button"
                className="wallet-action wallet-action-soft"
                onClick={() => setDeviceDetailsId(null)}
              >
                {tt('common.cancel')}
              </button>
              <button
                type="button"
                className="wallet-action"
                onClick={() => {
                  const updated = renameDeviceSession(deviceDetails.id, renameValue);
                  if (updated) {
                    toastSuccess(tt('security.toast_device_renamed'));
                    setDeviceDetailsId(null);
                  } else {
                    toastError(tt('security.toast_device_rename_failed'));
                  }
                }}
              >
                {tt('common.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
