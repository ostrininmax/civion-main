'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '../Breadcrumbs';
import { Section } from '../Section';
import { SERVICE_DEFINITIONS } from '../../lib/mockData/definitions';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { RequestWizard } from './RequestWizard';
import {
  localizeServiceEligibility,
  localizeServiceOutcome,
  localizeServiceRequirement,
  localizeServiceStep,
  localizeServiceTitle,
  t
} from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

function documentMatchesRequirement(requirement: string, title: string, category: string) {
  const req = requirement.toLowerCase();
  return req.includes(title.toLowerCase().split(' ')[0]) || req.includes(category.replace('_', ' '));
}

export function ServiceDetails({ slug }: { slug: string }) {
  const router = useRouter();
  const state = useDemoState();
  const { locale, t: tt } = useTranslation();
  const [wizardOpen, setWizardOpen] = useState(false);

  const service = useMemo(() => SERVICE_DEFINITIONS.find((item) => item.slug === slug) ?? null, [slug]);

  if (!service) {
    return (
      <Section title={tt('services.service_not_found')} action={tt('services.service_not_found_action')}>
        <p style={{ color: 'var(--ink-500)' }}>{tt('services.service_not_found_desc', { slug })}</p>
        <Link href="/services" className="wallet-action" style={{ marginTop: 10, textDecoration: 'none' }}>
          {tt('services.back_to_services')}
        </Link>
      </Section>
    );
  }

  const requiredDocuments = service.requirements.map((requirement) => {
    const match = state.documents.find((document) => documentMatchesRequirement(requirement, document.title, document.category));
    return { requirement, match };
  });

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/services', label: tt('nav.services') },
          { label: localizeServiceTitle(locale, service.slug, service.title) }
        ]}
      />

      <Section
        title={localizeServiceTitle(locale, service.slug, service.title)}
        action={tt('services.expected_time', { days: service.expectedDays })}
      >
        <div className="service-details-grid">
          <article className="service-details-card">
            <h3>{tt('services.what_you_get')}</h3>
            <p>{localizeServiceOutcome(locale, service.slug, service.outcome)}</p>
          </article>
          <article className="service-details-card">
            <h3>{tt('services.who_is_eligible')}</h3>
            <p>{localizeServiceEligibility(locale, service.slug, service.eligibility)}</p>
          </article>
          <article className="service-details-card">
            <h3>{tt('services.fees')}</h3>
            <p>{service.feeEur > 0 ? tt('services.fee', { amount: service.feeEur }) : tt('services.no_payment_required')}</p>
          </article>
          <article className="service-details-card">
            <h3>{tt('services.mode')}</h3>
            <p>{t(locale, `service.mode.${service.mode}`)}</p>
          </article>
        </div>

        <div className="service-details-actions">
          <button type="button" className="wallet-action wallet-action-primary" onClick={() => setWizardOpen(true)}>
            {tt('services.start_request')}
          </button>
          {service.requiresAppointment ? (
            <Link href="/appointments?book=1" className="wallet-action" style={{ textDecoration: 'none' }}>
              {tt('services.book_appointment')}
            </Link>
          ) : null}
          <button type="button" className="wallet-action wallet-action-soft" onClick={() => router.push('/services')}>
            {tt('services.back_to_services')}
          </button>
        </div>
      </Section>

      <Section title={tt('services.requirements')} action={tt('common.items_count', { count: service.requirements.length })}>
        <div className="request-requirements-grid">
          {requiredDocuments.map((item) => (
            <article key={item.requirement} className="request-requirement-card">
              <h4>{localizeServiceRequirement(locale, item.requirement)}</h4>
              <p>
                {item.match
                  ? tt('services.requirements_found', { title: t(locale, `doc.${item.match.category}`, item.match.title) })
                  : tt('services.requirements_missing')}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title={tt('services.process_steps')} action={tt('services.workflow')}>
        <ol className="service-steps-list">
          {service.steps.map((step) => (
            <li key={step}>{localizeServiceStep(locale, step)}</li>
          ))}
        </ol>
      </Section>

      <RequestWizard
        open={wizardOpen}
        service={service}
        documents={state.documents}
        profile={state.profile}
        locale={locale}
        onClose={() => setWizardOpen(false)}
        onSubmitted={() => {
          // State is already updated by store actions.
        }}
      />
    </>
  );
}
