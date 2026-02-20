'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getDemoScenario } from '../../lib/demo/scenarios';
import { runDemoScenarioStep } from '../../lib/demo/engine';
import {
  pushDemoToast,
  resetDemoRuntimeState,
  setPresenterActive,
  setPresenterStep
} from '../../lib/demo/runtime-store';
import { resetDemoState } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { useTranslation } from '../../lib/i18n/context';

export function PresenterModeClient() {
  const state = useDemoState();
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [livePath, setLivePath] = useState('/wallet?filter=expiring&doc=doc-residence');
  const scenario = useMemo(() => getDemoScenario('presenter-script'), []);
  const executedStepRef = useRef<string | null>(null);
  const steps = useMemo(() => scenario?.steps ?? [], [scenario]);

  useEffect(() => {
    setPresenterActive(true);
    return () => setPresenterActive(false);
  }, []);

  useEffect(() => {
    setPresenterStep(stepIndex);
  }, [stepIndex]);

  useEffect(() => {
    if (!scenario || !steps[stepIndex]) return;
    const step = steps[stepIndex];
    const signature = `${step.id}:${stepIndex}`;
    if (executedStepRef.current === signature) return;
    executedStepRef.current = signature;

    runDemoScenarioStep(step, {
      locale: state.locale,
      navigate: (path) => setLivePath(path)
    });
  }, [scenario, state.locale, stepIndex, steps]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'n') {
        setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
      }
      if (event.key.toLowerCase() === 'p') {
        setStepIndex((prev) => Math.max(0, prev - 1));
      }
      if (event.key.toLowerCase() === 'r') {
        resetDemoState();
        resetDemoRuntimeState();
        setStepIndex(0);
        setLivePath('/wallet?filter=expiring&doc=doc-residence');
      }
      if (event.key.toLowerCase() === 'f' && livePath.startsWith('/civic-card')) {
        setLivePath('/civic-card?big=1');
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [livePath, steps.length]);

  if (!scenario) {
    return null;
  }

  return (
    <section className="presenter-layout">
      <aside className="card presenter-script">
        <p className="wallet-stat-label">{t('demo.presenter.badge')}</p>
        <h1>{t('demo.presenter.title')}</h1>
        <p>{t('demo.presenter.description')}</p>

        <ol className="presenter-steps">
          {steps.map((step, index) => (
            <li key={step.id} className={index === stepIndex ? 'presenter-step-active' : ''}>
              <strong>{t(step.titleKey)}</strong>
              <p>{t(step.bodyKey)}</p>
            </li>
          ))}
        </ol>

        <div className="presenter-actions">
          <button type="button" className="wallet-action wallet-action-soft" onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}>
            {t('common.back')} (P)
          </button>
          <button
            type="button"
            className="wallet-action wallet-action-primary"
            onClick={() => setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
          >
            {t('demo.presenter.next_step')} (N)
          </button>
          <button
            type="button"
            className="wallet-action"
            onClick={() => {
              resetDemoState();
              resetDemoRuntimeState();
              setStepIndex(0);
              setLivePath('/wallet?filter=expiring&doc=doc-residence');
              pushDemoToast(t('settings.reset_demo'));
            }}
          >
            {t('settings.reset_demo')} (R)
          </button>
        </div>
      </aside>

      <article className="card presenter-live">
        <header className="presenter-live-head">
          <div>
            <p className="wallet-stat-label">{t('demo.presenter.live')}</p>
            <h2>{t('demo.presenter.current_view')}</h2>
          </div>
          <Link href={livePath} className="wallet-action" target="_blank">
            {t('common.open')}
          </Link>
        </header>

        <div className="presenter-iframe-shell">
          <iframe title={t('demo.presenter.iframe_title')} src={livePath} className="presenter-iframe" />
        </div>
      </article>
    </section>
  );
}
