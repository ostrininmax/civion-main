'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Section } from '../../components/Section';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { EmergencyLockControl } from '../../components/security/EmergencyLockControl';
import { resetDemoState, setDemoMode } from '../../lib/storage/demo-store';
import { resetDemoRuntimeState, setQaMode } from '../../lib/demo/runtime-store';
import { dispatchOnboardingCommand, ONBOARDING_STATE_EVENT, readOnboardingMeta } from '../../lib/onboarding/tourEngine';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { useTranslation } from '../../lib/i18n/context';
import { useDemoRuntimeState } from '../../lib/demo/use-demo-runtime';
import { toastSuccess } from '../../lib/ux-actions';

export default function SettingsPage() {
  const state = useDemoState();
  const runtime = useDemoRuntimeState();
  const { t } = useTranslation();
  const [tourMeta, setTourMeta] = useState(() => readOnboardingMeta());

  useEffect(() => {
    const sync = () => {
      setTourMeta(readOnboardingMeta());
    };

    sync();
    window.addEventListener(ONBOARDING_STATE_EVENT, sync);
    return () => {
      window.removeEventListener(ONBOARDING_STATE_EVENT, sync);
    };
  }, []);

  return (
    <>
      <Section title={t('settings.title')} action={t('settings.action')}>
        <div className="settings-grid">
          <article className="settings-card">
            <div className="badge">{t('settings.language_badge')}</div>
            <p className="settings-text">{t('settings.language_desc')}</p>
            <LanguageSwitcher />
          </article>

          <article className="settings-card">
            <div className="badge">{t('settings.demo_badge')}</div>
            <p className="settings-text">{t('settings.demo_desc')}</p>
            <label className="wallet-flow-check">
              <input type="checkbox" checked={state.demoMode} onChange={(event) => setDemoMode(event.target.checked)} />
              <span>{state.demoMode ? t('settings.demo_enabled') : t('settings.demo_disabled')}</span>
            </label>
            <button
              type="button"
              className="wallet-action wallet-action-soft"
              onClick={() => {
                resetDemoState();
                resetDemoRuntimeState();
                toastSuccess(t('settings.reset_demo'), 'settings.reset_demo');
              }}
            >
              {t('settings.reset_demo')}
            </button>
            {state.demoMode ? (
              <>
                <label className="wallet-flow-check" style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={runtime.qa.enabled}
                    onChange={(event) => setQaMode(event.target.checked)}
                  />
                  <span>
                    {runtime.qa.enabled
                      ? t('qa.mode.disable', undefined, 'Disable QA mode')
                      : t('qa.mode.enable', undefined, 'Enable QA mode')}
                  </span>
                </label>
                <Link href="/qa" className="section-action-link">
                  {t('qa.open_page', undefined, 'Open Interaction Checklist')}
                </Link>
              </>
            ) : null}
          </article>

          <article className="settings-card">
            <div className="badge">{t('settings.tour_badge')}</div>
            <p className="settings-text">{t('settings.tour_desc')}</p>
            {tourMeta.canResume ? (
              <p className="settings-text">
                {t('settings.tour_progress', {
                  step: (tourMeta.progressIndex ?? 0) + 1
                })}
              </p>
            ) : null}
            <div className="wallet-flow-checklist">
              <button
                type="button"
                className="wallet-action"
                onClick={() => {
                  dispatchOnboardingCommand('start');
                  toastSuccess(t('settings.start_tour'), 'settings.start_tour');
                }}
              >
                {t('settings.start_tour')}
              </button>
              {tourMeta.canResume ? (
                <button
                  type="button"
                  className="wallet-action wallet-action-soft"
                  onClick={() => {
                    dispatchOnboardingCommand('resume');
                    toastSuccess(t('settings.resume_tour'), 'settings.resume_tour');
                  }}
                >
                  {t('settings.resume_tour')}
                </button>
              ) : null}
              <button
                type="button"
                className="wallet-action wallet-action-soft"
                onClick={() => {
                  dispatchOnboardingCommand('restart');
                  toastSuccess(t('settings.restart_tour'), 'settings.restart_tour');
                }}
              >
                {t('settings.restart_tour')}
              </button>
            </div>
          </article>

          <article className="settings-card">
            <div className="badge">{t('settings.links_badge')}</div>
            <div className="settings-links">
              <Link href="/notifications" className="section-action-link">
                {t('settings.notifications_center')}
              </Link>
              <Link href="/profile" className="section-action-link">
                {t('settings.profile')}
              </Link>
              <Link href="/consents" className="section-action-link">
                {t('settings.consents')}
              </Link>
              <Link href="/security" className="section-action-link">
                {t('settings.security')}
              </Link>
              <EmergencyLockControl compact />
            </div>
          </article>
        </div>
      </Section>
    </>
  );
}
