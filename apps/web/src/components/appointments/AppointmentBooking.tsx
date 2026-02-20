'use client';

import { useEffect, useMemo, useState } from 'react';
import { Section } from '../Section';
import { addAppointment, rescheduleAppointment } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { useTranslation } from '../../lib/i18n/context';
import { t as translate, ti } from '../../lib/i18n';
import type { LocaleCode } from '../../lib/models/types';

const offices = ['Nicosia', 'Limassol', 'Larnaca', 'Paphos'] as const;

const slots = [
  '2026-02-23T09:00:00.000Z',
  '2026-02-23T11:30:00.000Z',
  '2026-02-24T10:00:00.000Z',
  '2026-02-25T13:30:00.000Z',
  '2026-02-26T15:00:00.000Z'
];

function localizeOffice(locale: LocaleCode, office: (typeof offices)[number]) {
  if (office === 'Nicosia') return translate(locale, 'office.nicosia', office);
  if (office === 'Limassol') return translate(locale, 'office.limassol', office);
  if (office === 'Larnaca') return translate(locale, 'office.larnaca', office);
  return translate(locale, 'office.paphos', office);
}

function localizeAppointmentTitle(locale: LocaleCode, title: string) {
  if (title === 'Migration Department appointment') {
    return translate(locale, 'appointments.migration_department_title', title);
  }
  if (title === 'Tax office consultation') {
    return translate(locale, 'appointments.tax_consultation_title', title);
  }
  if (title === 'Citizen service appointment') {
    return translate(locale, 'appointments.default_title', title);
  }

  const requestMatch = title.match(/^Request appointment \((.+)\)$/);
  if (requestMatch) {
    return ti(locale, 'appointments.request_title', { requestId: requestMatch[1] }, title);
  }

  return title;
}

export function AppointmentBooking({ autoOpenBook = false, requestId }: { autoOpenBook?: boolean; requestId?: string }) {
  const state = useDemoState();
  const { locale, t, formatDateTime } = useTranslation();
  const [open, setOpen] = useState(autoOpenBook);
  const [mode, setMode] = useState<'book' | 'reschedule'>('book');
  const [targetAppointmentId, setTargetAppointmentId] = useState('');
  const [office, setOffice] = useState<(typeof offices)[number]>('Nicosia');
  const [dateTime, setDateTime] = useState(slots[0]);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpenBook) setOpen(true);
  }, [autoOpenBook]);

  useEffect(() => {
    if (!confirmation) return;
    const timer = window.setTimeout(() => setConfirmation(null), 2600);
    return () => window.clearTimeout(timer);
  }, [confirmation]);

  const upcoming = useMemo(
    () => state.appointments.filter((item) => item.status === 'upcoming').sort((a, b) => (a.dateTime < b.dateTime ? -1 : 1)),
    [state.appointments]
  );
  const past = useMemo(
    () => state.appointments.filter((item) => item.status !== 'upcoming').sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1)),
    [state.appointments]
  );

  return (
    <>
      <Section title={t('appointments.title')} action={t('appointments.action', { count: upcoming.length })}>
        <div className="service-details-actions">
          <button
            type="button"
            className="wallet-action wallet-action-primary"
            onClick={() => {
              setMode('book');
              setOpen(true);
            }}
          >
            {t('appointments.book')}
          </button>
        </div>

        <div className="appointments-columns">
          <article className="appointment-column">
            <h3>{t('appointments.upcoming')}</h3>
            {upcoming.length === 0 ? (
              <p className="wallet-log-meta">{t('appointments.none_upcoming')}</p>
            ) : (
              upcoming.map((item) => (
                <div key={item.id} className="appointment-item">
                  <p>
                    <strong>{localizeAppointmentTitle(locale, item.title)}</strong>
                  </p>
                  <p>{localizeOffice(locale, item.office)}</p>
                  <p>{formatDateTime(item.dateTime)}</p>
                  <button
                    type="button"
                    className="wallet-action wallet-action-soft"
                    onClick={() => {
                      setMode('reschedule');
                      setTargetAppointmentId(item.id);
                      setDateTime(item.dateTime);
                      setOffice(item.office);
                      setOpen(true);
                    }}
                  >
                    {t('appointments.reschedule')}
                  </button>
                </div>
              ))
            )}
          </article>
          <article className="appointment-column">
            <h3>{t('appointments.past')}</h3>
            {past.length === 0 ? (
              <p className="wallet-log-meta">{t('appointments.none_past')}</p>
            ) : (
              past.map((item) => (
                <div key={item.id} className="appointment-item appointment-item-past">
                  <p>
                    <strong>{localizeAppointmentTitle(locale, item.title)}</strong>
                  </p>
                  <p>{localizeOffice(locale, item.office)}</p>
                  <p>{formatDateTime(item.dateTime)}</p>
                </div>
              ))
            )}
          </article>
        </div>
      </Section>

      {open ? (
        <div className="wallet-inline-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="wallet-inline-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-flow-title">
            <h4 id="appointment-flow-title">{mode === 'book' ? t('appointments.book_title') : t('appointments.reschedule_title')}</h4>
            <label className="wallet-inline-label" htmlFor="appointment-office">
              {t('appointments.office')}
            </label>
            <select
              id="appointment-office"
              className="wallet-field"
              value={office}
              onChange={(event) => setOffice(event.target.value as (typeof offices)[number])}
            >
              {offices.map((item) => (
                <option key={item} value={item}>
                  {localizeOffice(locale, item)}
                </option>
              ))}
            </select>

            <label className="wallet-inline-label" htmlFor="appointment-slot">
              {t('appointments.slot')}
            </label>
            <select id="appointment-slot" className="wallet-field" value={dateTime} onChange={(event) => setDateTime(event.target.value)}>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatDateTime(slot)}
                </option>
              ))}
            </select>

            <div className="wallet-inline-actions">
              <button type="button" className="wallet-action wallet-action-soft" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="wallet-action wallet-action-primary"
                onClick={() => {
                  if (mode === 'book') {
                    addAppointment({
                      title: requestId
                        ? ti('en', 'appointments.request_title', { requestId }, `Request appointment (${requestId})`)
                        : translate('en', 'appointments.default_title', 'Citizen service appointment'),
                      office,
                      dateTime,
                      requestId
                    });
                    setConfirmation(t('appointments.toast_booked'));
                  } else if (targetAppointmentId) {
                    rescheduleAppointment(targetAppointmentId, dateTime);
                    setConfirmation(t('appointments.toast_rescheduled'));
                  }

                  setOpen(false);
                  setTargetAppointmentId('');
                }}
              >
                {t('appointments.confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmation ? <div className="wallet-toast" role="status">{confirmation}</div> : null}
    </>
  );
}
