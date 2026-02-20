'use client';

import Link from 'next/link';
import { StatCard } from '../StatCard';
import { Section } from '../Section';
import { NextStepsCard, type NextStepItem } from './NextStepsCard';
import { SearchBar, type GlobalSearchResult } from './SearchBar';
import { SERVICE_DEFINITIONS } from '../../lib/mockData/definitions';
import { localizeServiceTitle, t, ti } from '../../lib/i18n';
import { lifecycleForExpiry } from '../../lib/wallet-rights';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { getServiceVisual } from '../../lib/service-ui';
import { StatusPill } from '../StatusPill';
import { statusLabelForRequest, statusToneForRequest } from '../../lib/status';
import { useMemo, useState } from 'react';
import { useTranslation } from '../../lib/i18n/context';

function daysToExpiry(expiryDate?: string) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function profileReadinessPercent(state: ReturnType<typeof useDemoState>) {
  const baseFields = [
    state.profile.fullName,
    state.profile.dateOfBirth,
    state.profile.address,
    state.profile.phone,
    state.profile.email,
    state.profile.emergencyContact
  ];
  const baseScore = Math.round((baseFields.filter(Boolean).length / baseFields.length) * 70);

  const activeDocuments = state.documents.filter((item) => lifecycleForExpiry(item.expiryDate) !== 'expired').length;
  const docsScore = Math.min(30, activeDocuments * 5);
  return Math.min(100, baseScore + docsScore);
}

export function DashboardClient() {
  const state = useDemoState();
  const { formatDate } = useTranslation();
  const [query, setQuery] = useState('');

  const expiringDocs = useMemo(
    () =>
      state.documents.filter((item) => {
        const days = daysToExpiry(item.expiryDate);
        return days !== null && days >= 0 && days <= 30;
      }),
    [state.documents]
  );

  const activeRequests = useMemo(
    () => state.requests.filter((item) => !['completed', 'rejected'].includes(item.status)),
    [state.requests]
  );

  const readiness = profileReadinessPercent(state);

  const nextSteps = useMemo<NextStepItem[]>(() => {
    const residencePermit = state.documents.find((item) => item.category === 'residence_permit');
    const residenceDays = daysToExpiry(residencePermit?.expiryDate);

    const addressProof = state.documents.find((item) => item.category === 'proof_of_address');
    const addressStatus = lifecycleForExpiry(addressProof?.expiryDate);

    const primarySteps: NextStepItem[] = [
      {
        id: 'step-renew',
        title:
          residenceDays !== null
            ? ti(state.locale, 'dashboard.residence_expires', { days: Math.max(0, residenceDays) })
            : t(state.locale, 'dashboard.residence_expires', 'Residence Permit status check'),
        description: t(state.locale, 'dashboard.avoid_interruption'),
        href: '/wallet?filter=expiring',
        ctaLabel: t(state.locale, 'dashboard.renew_now')
      },
      {
        id: 'step-profile',
        title: ti(state.locale, 'dashboard.profile_completeness', { percent: readiness }),
        description:
          addressStatus === 'expired'
            ? t(state.locale, 'dashboard.add_missing_address')
            : t(state.locale, 'dashboard.review_profile'),
        href: '/wallet?filter=expired',
        ctaLabel: t(state.locale, 'dashboard.complete_profile')
      },
      {
        id: 'step-track',
        title:
          activeRequests.length === 1
            ? ti(state.locale, 'dashboard.services_in_progress', { count: activeRequests.length })
            : ti(state.locale, 'dashboard.services_in_progress_plural', { count: activeRequests.length }),
        description: t(state.locale, 'dashboard.track_request'),
        href: activeRequests[0] ? `/timeline/${activeRequests[0].id}` : '/timeline',
        ctaLabel: t(state.locale, 'dashboard.track_request')
      }
    ];

    if (state.demoMode) {
      primarySteps.push({
        id: 'step-border',
        title: t(state.locale, 'demo.border.next_step_title'),
        description: t(state.locale, 'demo.border.next_step_desc'),
        href: '/authority-check?mode=border',
        ctaLabel: t(state.locale, 'demo.controls.border_crossing')
      });
    }

    return primarySteps;
  }, [activeRequests, readiness, state.demoMode, state.documents, state.locale]);

  const results = useMemo<GlobalSearchResult[]>(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const documentResults: GlobalSearchResult[] = state.documents
      .filter((item) => item.title.toLowerCase().includes(term) || item.issuer.toLowerCase().includes(term))
      .map((item) => ({
        id: `doc-${item.id}`,
        title: t(state.locale, `doc.${item.category}`, item.title),
        subtitle: `${item.issuer} · ${
          item.expiryDate
            ? `${t(state.locale, 'wallet.label_expiry_date')} ${formatDate(item.expiryDate, { year: 'numeric', month: 'short', day: '2-digit' })}`
            : t(state.locale, 'wallet.not_provided')
        }`,
        type: 'document',
        href: '/wallet'
      }));

    const serviceResults: GlobalSearchResult[] = SERVICE_DEFINITIONS.filter(
      (item) => item.title.toLowerCase().includes(term) || item.category.toLowerCase().includes(term)
    ).map((item) => ({
      id: `srv-${item.slug}`,
      title: localizeServiceTitle(state.locale, item.slug, item.title),
      subtitle: `${ti(state.locale, 'common.days_short', { count: item.expectedDays })} · ${t(state.locale, `service.mode.${item.mode}`)}`,
      type: 'service',
      href: `/services/${item.slug}`
    }));

    const requestResults: GlobalSearchResult[] = state.requests
      .filter(
        (item) =>
          item.reference.toLowerCase().includes(term) ||
          item.serviceTitle.toLowerCase().includes(term) ||
          item.status.toLowerCase().includes(term)
      )
      .map((item) => ({
        id: `req-${item.id}`,
        title: `${item.reference} · ${localizeServiceTitle(state.locale, item.serviceSlug, item.serviceTitle)}`,
        subtitle: statusLabelForRequest(item.status, state.locale),
        type: 'request',
        href: `/timeline/${item.id}`
      }));

    return [...documentResults, ...serviceResults, ...requestResults].slice(0, 9);
  }, [formatDate, query, state.documents, state.locale, state.requests]);

  const featuredServices = useMemo(
    () => SERVICE_DEFINITIONS.filter((item) => item.mostUsed || item.recommended).slice(0, 4),
    []
  );

  return (
    <>
      <NextStepsCard
        subtitle={t(state.locale, 'dashboard.personalized_recommendations')}
        title={t(state.locale, 'dashboard.next_steps')}
        items={nextSteps}
      />

      <Section title={t(state.locale, 'dashboard.search')} action={t(state.locale, 'dashboard.search_scope')}>
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          results={results}
          label={t(state.locale, 'dashboard.search_platform')}
          emptyLabel={t(state.locale, 'dashboard.search_empty')}
          placeholder={t(state.locale, 'dashboard.search_placeholder')}
        />
      </Section>

      <Section title={t(state.locale, 'dashboard.quick_actions')} action={t(state.locale, 'dashboard.one_tap_tasks')}>
        <div className="quick-actions-grid" data-tour="dashboard-quick-actions">
          <Link href="/wallet" className="quick-action-item">
            {t(state.locale, 'dashboard.upload_document')}
          </Link>
          <Link href="/civic-card" className="quick-action-item">
            {t(state.locale, 'dashboard.share_proof')}
          </Link>
          <Link href="/services" className="quick-action-item">
            {t(state.locale, 'dashboard.start_request')}
          </Link>
          <Link href="/appointments?book=1" className="quick-action-item">
            {t(state.locale, 'dashboard.book_appointment')}
          </Link>
        </div>
      </Section>

      <div className="grid-3">
        <StatCard
          label={t(state.locale, 'dashboard.documents_label')}
          value={String(state.documents.length)}
          hint={
            <Link href="/wallet?filter=expiring" className="stat-hint-link">
              {ti(state.locale, 'dashboard.documents_expiring_hint', { count: expiringDocs.length })}
            </Link>
          }
        />
        <StatCard
          label={t(state.locale, 'dashboard.active_services_label')}
          value={String(activeRequests.length)}
          hint={t(state.locale, 'dashboard.requests_in_progress')}
        />
        <StatCard
          label={t(state.locale, 'dashboard.readiness_label')}
          value={`${readiness}%`}
          hint={t(state.locale, 'dashboard.profile_docs_hint')}
        />
      </div>

      <Section title={t(state.locale, 'dashboard.featured')} action={t(state.locale, 'dashboard.featured_action')}>
        <div className="card" style={{ background: 'linear-gradient(145deg, #11192f, #245ac4 45%, #69d8c9)', color: '#fff' }}>
          <h3 style={{ fontSize: 36, lineHeight: 1.05, fontWeight: 700 }}>{t(state.locale, 'nav.civic_card')}</h3>
          <p style={{ marginTop: 8, opacity: 0.9 }}>{t(state.locale, 'dashboard.featured_description')}</p>
          <Link
            href="/civic-card"
            className="wallet-action"
            style={{ marginTop: 16, textDecoration: 'none', background: 'rgba(255,255,255,0.95)' }}
          >
            {t(state.locale, 'dashboard.open_civic_card')}
          </Link>
        </div>
      </Section>

      <Section
        title={t(state.locale, 'dashboard.most_used_services')}
        action={
          <Link href="/services" className="section-action-link">
            {t(state.locale, 'dashboard.all_services')}
          </Link>
        }
      >
        <div className="services-quick-grid">
          {featuredServices.map((service) => {
            const status = state.requests.find((item) => item.serviceSlug === service.slug)?.status;
            const visual = getServiceVisual(service.slug, service.title);

            return (
              <Link key={service.slug} href={`/services/${service.slug}`} className="service-quick-card">
                <span className={`service-icon-tile service-icon-${visual.accent}`}>{visual.shortCode}</span>
                <div className="service-quick-main">
                  <h3>{localizeServiceTitle(state.locale, service.slug, service.title)}</h3>
                  <p className="service-quick-local">{t(state.locale, `service.category.${service.category}`)}</p>
                  <div className="service-quick-foot">
                    <span>
                      {service.requiresPayment
                        ? ti(state.locale, 'dashboard.fee_eur', { fee: service.feeEur })
                        : t(state.locale, 'dashboard.no_fee')}
                    </span>
                    <StatusPill
                      label={status ? statusLabelForRequest(status, state.locale) : t(state.locale, 'dashboard.ready')}
                      tone={status ? statusToneForRequest(status) : 'neutral'}
                    />
                  </div>
                </div>
                <span className="service-quick-arrow" aria-hidden>
                  ›
                </span>
              </Link>
            );
          })}
        </div>
      </Section>
    </>
  );
}
