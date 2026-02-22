'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Section } from '../Section';
import { SERVICE_DEFINITIONS } from '../../lib/mockData/definitions';
import type { ServiceCategory } from '../../lib/models/types';
import {
  localizeServiceEligibility,
  localizeServiceOutcome,
  localizeServiceTitle,
  t
} from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

const categories: Array<{ value: 'all' | ServiceCategory; key: string }> = [
  { value: 'all', key: 'services.filter_all_categories' },
  { value: 'identity', key: 'services.filter_identity' },
  { value: 'migration', key: 'services.filter_migration' },
  { value: 'education', key: 'services.filter_education' },
  { value: 'taxes', key: 'services.filter_taxes' },
  { value: 'business', key: 'services.filter_business' },
  { value: 'healthcare', key: 'services.filter_healthcare' }
];

export function ServiceCatalog() {
  const { locale, t: tt } = useTranslation();
  const [category, setCategory] = useState<'all' | ServiceCategory>('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [requiresAppointment, setRequiresAppointment] = useState(false);
  const [requiresPayment, setRequiresPayment] = useState(false);

  const filtered = useMemo(
    () =>
      SERVICE_DEFINITIONS.filter((item) => {
        if (category !== 'all' && item.category !== category) return false;
        if (onlineOnly && item.mode === 'in_person') return false;
        if (requiresAppointment && !item.requiresAppointment) return false;
        if (requiresPayment && !item.requiresPayment) return false;
        return true;
      }),
    [category, onlineOnly, requiresAppointment, requiresPayment]
  );

  const mostUsed = filtered.filter((item) => item.mostUsed);
  const recommended = filtered.filter((item) => item.recommended);

  return (
    <>
      <Section title={tt('services.catalog_title')} action={tt('services.catalog_action', { count: filtered.length })}>
        <div className="services-filter-grid">
          <label className="wallet-query-label" htmlFor="services-category">
            {tt('services.category')}
          </label>
          <select
            id="services-category"
            className="wallet-field"
            value={category}
            onChange={(event) => setCategory(event.target.value as 'all' | ServiceCategory)}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {tt(item.key)}
              </option>
            ))}
          </select>
          <label className="wallet-flow-check">
            <input type="checkbox" checked={onlineOnly} onChange={(event) => setOnlineOnly(event.target.checked)} />
            <span>{tt('services.filter_online_only')}</span>
          </label>
          <label className="wallet-flow-check">
            <input
              type="checkbox"
              checked={requiresAppointment}
              onChange={(event) => setRequiresAppointment(event.target.checked)}
            />
            <span>{tt('services.filter_requires_appointment')}</span>
          </label>
          <label className="wallet-flow-check">
            <input type="checkbox" checked={requiresPayment} onChange={(event) => setRequiresPayment(event.target.checked)} />
            <span>{tt('services.filter_requires_payment')}</span>
          </label>
        </div>
      </Section>

      <Section title={tt('services.most_used_title')} action={tt('services.most_used_action')}>
        {mostUsed.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{tt('services.no_services_title')}</h3>
            <p>{tt('services.no_services_desc')}</p>
          </div>
        ) : (
          <div className="services-catalog-grid">
            {mostUsed.map((item) => (
              <article key={item.slug} className="service-catalog-card">
                <h3>{localizeServiceTitle(locale, item.slug, item.title)}</h3>
                <p>{tt('services.days_estimated', { days: item.expectedDays })}</p>
                <p>{tt('services.requirements_count', { count: item.requirements.length })}</p>
                <p>{t(locale, `service.mode.${item.mode}`)}</p>
                <Link href={`/services/${item.slug}`} className="wallet-action" style={{ textDecoration: 'none' }}>
                  {tt('services.open_service')}
                </Link>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title={tt('services.recommended_title')} action={tt('services.recommended_action')}>
        {recommended.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{tt('services.no_recommendations_title')}</h3>
            <p>{tt('services.no_recommendations_desc')}</p>
          </div>
        ) : (
          <div className="services-catalog-grid">
            {recommended.map((item) => (
              <article key={item.slug} className="service-catalog-card">
                <h3>{localizeServiceTitle(locale, item.slug, item.title)}</h3>
                <p>{localizeServiceOutcome(locale, item.slug, item.outcome)}</p>
                <div className="service-card-row">
                  <span>{tt('common.days_short', { count: item.expectedDays })}</span>
                  <span>{item.requiresPayment ? tt('services.fee', { amount: item.feeEur }) : tt('services.no_fee')}</span>
                </div>
                <Link
                  href={`/services/${item.slug}`}
                  className="wallet-action wallet-action-primary"
                  style={{ textDecoration: 'none' }}
                  data-tour={item.slug === 'temporary-residence-renewal' ? 'services-start-request' : undefined}
                >
                  {tt('services.start_request')}
                </Link>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title={tt('services.all_title')} action={tt('services.all_action')}>
        <div className="services-catalog-grid" data-tour="services-catalog">
          {filtered.map((item) => (
            <article key={item.slug} className="service-catalog-card">
              <h3>{localizeServiceTitle(locale, item.slug, item.title)}</h3>
              <p>{localizeServiceEligibility(locale, item.slug, item.eligibility)}</p>
              <div className="service-card-row">
                <span>{tt('common.days_short', { count: item.expectedDays })}</span>
                <span>{tt('services.requirements_count', { count: item.requirements.length })}</span>
                <span>{t(locale, `service.mode.${item.mode}`)}</span>
              </div>
              <Link href={`/services/${item.slug}`} className="wallet-action" style={{ textDecoration: 'none' }}>
                {tt('services.view_details')}
              </Link>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
