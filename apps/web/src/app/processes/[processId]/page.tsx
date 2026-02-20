import Link from 'next/link';
import { Section } from '../../../components/Section';
import { StatusPill } from '../../../components/StatusPill';
import { ProcessStatusActions, ProcessStepActionButton } from '../../../components/actions/ProcessStatusActions';
import { StartServiceButton } from '../../../components/actions/StartServiceButton';
import {
  getProcessCatalog,
  getProcessFlow,
  type ProcessCatalogItem,
  type ProcessInstance,
  type ProcessFlow
} from '../../../lib/api';
import { localizeServiceEligibility, localizeServiceStep, localizeServiceTitle, normalizeLocale, t, ti } from '../../../lib/i18n';

function readLocale(searchParams?: { lang?: string | string[] }) {
  const candidate = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang;
  return normalizeLocale(candidate);
}

function toReadableCategory(category: string) {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusTone(status: ProcessInstance['status'] | 'not_started') {
  if (status === 'completed') return 'success' as const;
  if (status === 'submitted') return 'warning' as const;
  if (status === 'in_progress') return 'neutral' as const;
  return 'neutral' as const;
}

export default async function ProcessDetailsPage({
  params,
  searchParams
}: {
  params: { processId: string };
  searchParams?: { lang?: string | string[] };
}) {
  const locale = readLocale(searchParams);
  const [catalog, flowResponse] = await Promise.all([getProcessCatalog(), getProcessFlow(params.processId)]);
  const process = catalog.find((item) => item.id === params.processId) as ProcessCatalogItem | undefined;

  function statusLabel(status: ProcessInstance['status'] | 'not_started') {
    if (status === 'not_started') return t(locale, 'processes.not_started');
    if (status === 'in_progress') return t(locale, 'processes.in_progress');
    if (status === 'submitted') return t(locale, 'processes.submitted');
    return t(locale, 'processes.completed');
  }

  if (!process) {
    return (
      <Section title={t(locale, 'process.not_found')} action={t(locale, 'process.not_found_action')}>
        <p style={{ color: 'var(--ink-500)' }}>{ti(locale, 'process.not_found_desc', { id: params.processId })}</p>
      </Section>
    );
  }

  const flow: ProcessFlow =
    flowResponse ??
    ({
      processId: process.id,
      status: 'not_started',
      instance: null,
      steps: process.steps.map((title, index) => ({ index, title, completed: false, available: false })),
      requiredDocuments: process.requiredDocuments.map((category) => ({ category, present: false })),
      completedStepCount: 0,
      totalStepCount: process.steps.length,
      progressPercent: 0,
      canSubmit: false,
      canComplete: false,
      blockers: [t(locale, 'process.blocker_api')]
    } satisfies ProcessFlow);
  const currentStatus = flow.status;
  const localizedProcessName = localizeServiceTitle(locale, process.id, process.name);
  const localizedEligibility = localizeServiceEligibility(locale, process.id, process.eligibilitySummary);

  return (
    <>
      <Section title={localizedProcessName} action={t(locale, 'process.title_details')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--ink-700)' }}>{localizedEligibility}</p>
          <StatusPill label={statusLabel(currentStatus)} tone={statusTone(currentStatus)} />
        </div>
        <div className="process-progress-track" style={{ marginTop: 14 }}>
          <div className="process-progress-fill" style={{ width: `${flow.progressPercent}%` }} />
        </div>
        <div className="process-progress-meta">
          <span>
            {ti(locale, 'process.steps_completed', { completed: flow.completedStepCount, total: flow.totalStepCount })}
          </span>
          <span>{ti(locale, 'process.ready', { percent: flow.progressPercent })}</span>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {flow.instance ? (
            <ProcessStatusActions instanceId={flow.instance.id} canSubmit={flow.canSubmit} canComplete={flow.canComplete} />
          ) : (
            <StartServiceButton processId={process.id} />
          )}
          {flow.instance ? <StartServiceButton processId={process.id} forceNew label={t(locale, 'process.start_new_submission')} /> : null}
          <Link className="wallet-action" href="/processes" style={{ textDecoration: 'none' }}>
            {t(locale, 'process.back_to_services')}
          </Link>
        </div>
        {flow.blockers.length > 0 ? (
          <ul className="process-blockers">
            {flow.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title={t(locale, 'process.checklist')} action={t(locale, 'process.required_documents')}>
        <div className="process-doc-grid">
          {flow.requiredDocuments.map((doc) => (
            <article key={doc.category} className="process-doc-card">
              <div className="process-doc-head">
                <h3>{t(locale, `doc.${doc.category}`, toReadableCategory(doc.category))}</h3>
                <StatusPill
                  label={doc.present ? t(locale, 'process.available') : t(locale, 'process.missing')}
                  tone={doc.present ? 'success' : 'critical'}
                />
              </div>
              <p>{doc.present ? doc.filename ?? t(locale, 'process.linked_from_registry') : t(locale, 'process.required_for_submission')}</p>
              {!doc.present ? (
                <Link href="/wallet" className="wallet-action" style={{ textDecoration: 'none' }}>
                  {t(locale, 'process.open_wallet')}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </Section>

      <Section title={t(locale, 'process.flow')} action={ti(locale, 'processes.eta', { days: process.estimatedDays })}>
        <div className="process-step-grid">
          {flow.steps.map((step) => (
            <article key={step.index} className="process-step-card">
              <div className="process-step-head">
                <h3>
                  {ti(locale, 'process.step', { index: step.index + 1, title: localizeServiceStep(locale, step.title) })}
                </h3>
                <StatusPill
                  label={step.completed ? t(locale, 'processes.completed') : step.available ? t(locale, 'process.ready_now') : t(locale, 'process.locked')}
                  tone={step.completed ? 'success' : step.available ? 'warning' : 'neutral'}
                />
              </div>
              <p>
                {step.completed
                  ? t(locale, 'process.step_completed_desc')
                  : step.available
                    ? t(locale, 'process.step_ready_desc')
                    : t(locale, 'process.step_locked_desc')}
              </p>
              {flow.instance && currentStatus === 'in_progress' && !step.completed ? (
                <ProcessStepActionButton instanceId={flow.instance.id} stepIndex={step.index} disabled={!step.available} />
              ) : null}
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
