'use client';

import { useState } from 'react';
import { Section } from '../../components/Section';
import { EmergencyLockControl } from '../../components/security/EmergencyLockControl';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { localizeAuthority, t, ti } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';
import { closeModal, logAuditEvent, openModal, pushNotification, toastSuccess } from '../../lib/ux-actions';

function localizeShownData(locale: Parameters<typeof t>[0], value: string) {
  if (value === 'Status + validity only') return t(locale, 'wallet.checks_data_status_validity');
  if (value === 'Status + validity + issuer') return t(locale, 'wallet.checks_data_status_validity_issuer');
  if (value === 'Student eligibility + expiry date') return t(locale, 'wallet.checks_data_student_eligibility');
  if (value === 'Identity status + tax id validity') return t(locale, 'wallet.checks_data_identity_tax');

  if (value.startsWith('Update request: ')) {
    const reason = value.slice('Update request: '.length).trim();
    return ti(locale, 'wallet.checks_data_update_request', { reason }, value);
  }

  const renewalMatch = value.match(/^Renewal submitted \((.+)\)$/);
  if (renewalMatch?.[1]) {
    return ti(locale, 'wallet.checks_data_renewal_submitted', { reference: renewalMatch[1] }, value);
  }

  return value;
}

function localizeLockHistoryType(locale: Parameters<typeof t>[0], type: 'lock' | 'unlock' | 'auto_unlock', lockType?: 'soft' | 'hard') {
  if (type === 'unlock') return t(locale, 'security.event_unlock');
  if (type === 'auto_unlock') return t(locale, 'security.event_auto_unlock');
  const lockTypeLabel = lockType === 'hard' ? t(locale, 'security.lock_type_hard') : t(locale, 'security.lock_type_soft');
  return ti(locale, 'security.event_lock', { type: lockTypeLabel });
}

export default function SecurityPage() {
  const state = useDemoState();
  const { locale, t: tt, formatDateTime } = useTranslation();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  return (
    <>
      <Section title={tt('security.emergency_title')} action={tt('security.action')}>
        <EmergencyLockControl />
      </Section>

      <Section title={tt('security.title')} action={tt('security.action')}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{tt('security.verifier')}</th>
                <th>{tt('security.result')}</th>
                <th>{tt('security.shown_data')}</th>
                <th className="mobile-hide">{tt('security.time')}</th>
              </tr>
            </thead>
            <tbody>
              {state.verificationEvents.slice(0, 20).map((event) => (
                <tr key={event.id}>
                  <td>{localizeAuthority(locale, event.verifier)}</td>
                  <td>{event.result === 'valid' ? tt('status.valid') : tt('status.invalid')}</td>
                  <td>{localizeShownData(locale, event.dataShown)}</td>
                  <td className="mobile-hide">{formatDateTime(event.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={tt('security.lock_history_title')} action={tt('common.total_count', { count: state.accountSecurity.lockHistory.length })}>
        {state.accountSecurity.lockHistory.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{tt('security.lock_history_title')}</h3>
            <p>{tt('notifications.none_desc')}</p>
          </div>
        ) : (
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
                {state.accountSecurity.lockHistory.slice(0, 20).map((event) => (
                  <tr key={event.id}>
                    <td>{localizeLockHistoryType(locale, event.type, event.lockType)}</td>
                    <td>{event.note ?? tt('common.na')}</td>
                    <td className="mobile-hide">{formatDateTime(event.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={tt('security.failed_checks_title')}
        action={tt('common.total_count', { count: state.accountSecurity.failedVerificationAttempts.length })}
      >
        {state.accountSecurity.failedVerificationAttempts.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{tt('security.failed_checks_title')}</h3>
            <p>{tt('notifications.none_desc')}</p>
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
                {state.accountSecurity.failedVerificationAttempts.slice(0, 20).map((event) => (
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

      <Section title={tt('security.sessions_title')} action={tt('security.signins_action')}>
        <div className="settings-grid">
          {state.accountSecurity.deviceSessions.map((session) => (
            <article key={session.id} className="settings-card">
              <div className="badge">{session.channel === 'web' ? tt('security.web') : session.channel === 'mobile' ? tt('security.mobile') : tt('security.tablet')}</div>
              <p className="settings-text">{tt('security.session_device')}: {session.device}</p>
              <p className="settings-text">{tt('security.session_location')}: {session.location}</p>
              <p className="settings-text">{tt('security.session_last_seen')}: {formatDateTime(session.lastSeenAt)}</p>
              <p className="settings-text">{tt('security.session_status')}: {session.active ? tt('security.session_active') : tt('security.session_inactive')}</p>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="wallet-action wallet-action-soft"
          style={{ marginTop: 10 }}
          onClick={() => openModal(setReportOpen, 'security.report_open')}
        >
          {tt('security.report')}
        </button>
      </Section>

      {reportOpen ? (
        <div className="wallet-inline-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeModal(setReportOpen, 'security.report_close')}>
          <div className="wallet-inline-modal" role="dialog" aria-modal="true" aria-labelledby="security-report-title">
            <h4 id="security-report-title">{tt('security.report_title')}</h4>
            <label className="wallet-inline-label" htmlFor="security-report-reason">
              {tt('security.report_reason')}
            </label>
            <textarea
              id="security-report-reason"
              className="wallet-inline-textarea"
              rows={4}
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder={tt('security.report_placeholder')}
              autoFocus
            />
            <div className="wallet-inline-actions">
              <button type="button" className="wallet-action wallet-action-soft" onClick={() => closeModal(setReportOpen, 'security.report_close')}>
                {tt('common.cancel')}
              </button>
              <button
                type="button"
                className="wallet-action wallet-action-primary"
                disabled={reportReason.trim().length < 4}
                onClick={() => {
                  const reason = reportReason.trim();
                  if (reason.length < 4) return;

                  logAuditEvent(
                    {
                      verifier: t('en', 'wallet.verifier_citizen_app', 'Citizen App'),
                      result: 'valid',
                      dataShown: `Security report: ${reason.slice(0, 90)}`
                    },
                    'security.report_submit'
                  );

                  pushNotification(
                    {
                      type: 'security',
                      title: t('en', 'security.report_notification_title'),
                      body: t('en', 'security.report_notification_body'),
                      ctaLabel: t('en', 'notification.open_security', 'Open security'),
                      ctaHref: '/security'
                    },
                    'security.report_submit'
                  );

                  toastSuccess(tt('security.report_sent'), 'security.report_submit');
                  setReportReason('');
                  closeModal(setReportOpen, 'security.report_close');
                }}
              >
                {tt('security.report_submit')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
