'use client';

import Link from 'next/link';
import { Section } from '../Section';
import { StatusPill } from '../StatusPill';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { statusLabelForRequest, statusToneForRequest } from '../../lib/status';
import { localizeRequestTimelineEvent, localizeServiceTitle } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

export function RequestTracker() {
  const state = useDemoState();
  const { locale, t, formatDateTime } = useTranslation();
  const requests = [...state.requests].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <>
      <Section title={t('requests.title')} action={t('common.total_count', { count: requests.length })}>
        {requests.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{t('requests.empty_title')}</h3>
            <p>{t('requests.empty_desc')}</p>
            <Link href="/services" className="wallet-action" style={{ textDecoration: 'none', marginTop: 10 }}>
              {t('requests.start_first')}
            </Link>
          </div>
        ) : (
          <div className="request-grid" data-tour="requests-list">
            {requests.map((request) => (
              <article key={request.id} className="request-card">
                <div className="request-card-head">
                  <div>
                    <p className="mono">{request.reference}</p>
                    <h3>{localizeServiceTitle(locale, request.serviceSlug, request.serviceTitle)}</h3>
                  </div>
                  <StatusPill label={statusLabelForRequest(request.status, state.locale)} tone={statusToneForRequest(request.status)} />
                </div>
                <p className="request-card-meta">{t('requests.updated', { date: formatDateTime(request.updatedAt) })}</p>
                <p className="request-card-meta">
                  {t('requests.delivery', {
                    mode: request.deliveryMethod === 'online' ? t('common.online') : t('common.in_person')
                  })}
                </p>
                <div className="request-card-actions">
                  <Link href={`/timeline/${request.id}`} className="wallet-action" style={{ textDecoration: 'none' }}>
                    {t('requests.open_details')}
                  </Link>
                  {request.status === 'appointment_required' ? (
                    <Link
                      href={`/appointments?book=1&requestId=${request.id}`}
                      className="wallet-action wallet-action-soft"
                      style={{ textDecoration: 'none' }}
                    >
                      {t('services.book_appointment')}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('requests.events_title')} action={t('requests.events_action')}>
        <div className="table-wrap" data-tour="timeline-tracker">
          <table className="table" data-tour="requests-tracker">
            <thead>
              <tr>
                <th>{t('timeline.event')}</th>
                <th>{t('timeline.status')}</th>
                <th className="mobile-hide">{t('timeline.time')}</th>
              </tr>
            </thead>
            <tbody>
              {state.requestTimeline.slice(0, 12).map((event) => (
                <tr key={event.id}>
                  <td>{localizeRequestTimelineEvent(locale, event.title)}</td>
                  <td>{statusLabelForRequest(event.status, state.locale)}</td>
                  <td className="mobile-hide">{formatDateTime(event.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
