'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDemoScenario } from '../../lib/demo/scenarios';
import { runDemoScenarioSteps } from '../../lib/demo/engine';
import {
  clearQaLogs,
  getDemoRuntimeState,
  dismissDemoToast,
  logQaClick,
  markQaFeedback,
  pushDemoToast,
  resetDemoRuntimeState,
  setActiveDemoScenario,
  setQaMode,
  startGuidedTour
} from '../../lib/demo/runtime-store';
import { useDemoRuntimeState } from '../../lib/demo/use-demo-runtime';
import { t, ti } from '../../lib/i18n';
import { resetDemoState } from '../../lib/storage/demo-store';
import { useDemoSelector } from '../../lib/storage/use-demo-state';
import { GuidedTourOverlay } from './GuidedTourOverlay';

function shouldHideControls(pathname: string) {
  return pathname.startsWith('/presenter') || pathname.startsWith('/authority-check');
}

function resolveInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest(
    'a[href], button, [role="button"], [role="menuitem"], input[type="checkbox"], input[type="radio"], select, summary'
  ) as HTMLElement | null;
}

function resolveActionLabel(element: HTMLElement) {
  const fromData = element.getAttribute('data-qa-label');
  if (fromData) return fromData;

  const fromAria = element.getAttribute('aria-label');
  if (fromAria) return fromAria;

  const text = element.textContent?.trim();
  if (text) return text.replace(/\s+/g, ' ').slice(0, 96);

  if (element instanceof HTMLAnchorElement && element.href) return element.href;
  return element.tagName.toLowerCase();
}

export function DemoExperienceLayer() {
  const demoMode = useDemoSelector((state) => state.demoMode);
  const locale = useDemoSelector((state) => state.locale);
  const runtime = useDemoRuntimeState();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!runtime.toasts.length) return;

    const timers = runtime.toasts.map((toastItem) =>
      window.setTimeout(() => {
        dismissDemoToast(toastItem.id);
      }, 3200)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [runtime.toasts]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('qa-mode', demoMode && runtime.qa.enabled);
    return () => document.body.classList.remove('qa-mode');
  }, [demoMode, runtime.qa.enabled]);

  useEffect(() => {
    if (!demoMode || !runtime.qa.enabled) return;

    const onClickCapture = (event: MouseEvent) => {
      const interactive = resolveInteractiveTarget(event.target);
      if (!interactive) return;

      const label = resolveActionLabel(interactive);
      const path = `${window.location.pathname}${window.location.search}`;
      const anchor = interactive.closest('a[href]') as HTMLAnchorElement | null;
      const action = anchor ? 'click_link' : 'click_control';
      const clickedAt = Date.now();

      logQaClick({
        label,
        action,
        path
      });

      if (anchor) return;

      window.setTimeout(() => {
        const runtimeState = getDemoRuntimeState();
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (currentPath !== path) return;
        if (runtimeState.qa.lastFeedbackAt > clickedAt) return;

        const hasDialog = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
        const hasToast = Boolean(document.querySelector('.wallet-toast, .demo-toast-item'));
        if (!hasDialog && !hasToast) {
          // eslint-disable-next-line no-console
          console.warn(`[QA] Possible no-op click detected: "${label}" at ${path}`);
        }
      }, 650);
    };

    document.addEventListener('click', onClickCapture, true);
    return () => {
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [demoMode, runtime.qa.enabled]);

  const controlsHidden = shouldHideControls(pathname);

  const quickScenarios = useMemo(
    () => [
      {
        id: 'police-check',
        label: t(locale, 'demo.controls.police_check')
      },
      {
        id: 'border-crossing',
        label: t(locale, 'demo.controls.border_crossing')
      }
    ],
    [locale]
  );

  if (!demoMode) {
    return <GuidedTourOverlay />;
  }

  const launchScenario = (scenarioId: string) => {
    const scenario = getDemoScenario(scenarioId);
    if (!scenario) return;
    setActiveDemoScenario(scenarioId);
    runDemoScenarioSteps(scenario.steps, {
      locale,
      navigate: (path) => router.push(path)
    });
    pushDemoToast(ti(locale, 'demo.toast.scenario_started', { scenario: t(locale, scenario.titleKey) }));
    setOpen(false);
  };

  return (
    <>
      {!controlsHidden ? (
        <>
          <button
            type="button"
            className="demo-floating-button"
            aria-label={t(locale, 'demo.controls.open')}
            onClick={() => setOpen((prev) => !prev)}
          >
            DEMO
          </button>

          {open ? (
            <aside className="demo-floating-panel card" aria-label={t(locale, 'demo.controls.panel_title')}>
              <p className="wallet-stat-label">{t(locale, 'demo.controls.panel_badge')}</p>
              <h3>{t(locale, 'demo.controls.panel_title')}</h3>
              <div className="demo-floating-actions">
                <button
                  type="button"
                  className="wallet-action wallet-action-primary"
                  onClick={() => {
                    startGuidedTour('guided-tour', 0);
                    markQaFeedback();
                    setOpen(false);
                  }}
                >
                  {t(locale, 'demo.controls.start_tour')}
                </button>
                <button
                  type="button"
                  className="wallet-action"
                  onClick={() => {
                    router.push('/presenter');
                    markQaFeedback();
                    setOpen(false);
                  }}
                >
                  {t(locale, 'demo.controls.presenter_mode')}
                </button>
                {quickScenarios.map((scenario) => (
                  <button key={scenario.id} type="button" className="wallet-action" onClick={() => {
                    launchScenario(scenario.id);
                    markQaFeedback();
                  }}>
                    {scenario.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="wallet-action"
                  onClick={() => {
                    setQaMode(!runtime.qa.enabled);
                    markQaFeedback();
                  }}
                >
                  {runtime.qa.enabled
                    ? t(locale, 'qa.mode.disable', 'Disable QA mode')
                    : t(locale, 'qa.mode.enable', 'Enable QA mode')}
                </button>
                <button
                  type="button"
                  className="wallet-action"
                  onClick={() => {
                    router.push('/qa');
                    markQaFeedback();
                    setOpen(false);
                  }}
                >
                  {t(locale, 'qa.open_page', 'Open Interaction Checklist')}
                </button>
                {runtime.qa.enabled ? (
                  <button
                    type="button"
                    className="wallet-action wallet-action-soft"
                    onClick={() => {
                      clearQaLogs();
                      markQaFeedback();
                    }}
                  >
                    {t(locale, 'qa.clear_logs', 'Clear QA logs')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="wallet-action wallet-action-soft"
                  onClick={() => {
                    resetDemoState();
                    resetDemoRuntimeState();
                    setOpen(false);
                    pushDemoToast(t(locale, 'settings.reset_demo'));
                    markQaFeedback();
                  }}
                >
                  {t(locale, 'settings.reset_demo')}
                </button>
              </div>
            </aside>
          ) : null}
        </>
      ) : null}

      <div className="demo-toast-stack" aria-live="polite">
        {runtime.toasts.slice(0, 3).map((toastItem) => (
          <div key={toastItem.id} className="demo-toast-item">
            {toastItem.message}
          </div>
        ))}
      </div>

      {demoMode && runtime.qa.enabled ? (
        <aside className="qa-console" aria-live="polite" aria-label={t(locale, 'qa.console.title', 'QA click console')}>
          <div className="qa-console-head">
            <strong>{t(locale, 'qa.console.title', 'QA click console')}</strong>
            <button
              type="button"
              className="wallet-action wallet-action-soft"
              onClick={() => {
                clearQaLogs();
                markQaFeedback();
              }}
            >
              {t(locale, 'qa.clear_logs', 'Clear QA logs')}
            </button>
          </div>
          <div className="qa-console-list">
            {runtime.qa.clickLogs.length === 0 ? (
              <p className="wallet-log-meta">{t(locale, 'qa.console.empty', 'No interactions logged yet')}</p>
            ) : (
              runtime.qa.clickLogs.slice(0, 40).map((entry) => (
                <div key={entry.id} className="qa-console-item">
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <strong>{entry.label}</strong>
                  <span>{entry.action}</span>
                  <code>{entry.path}</code>
                </div>
              ))
            )}
          </div>
        </aside>
      ) : null}

      <GuidedTourOverlay />
    </>
  );
}
