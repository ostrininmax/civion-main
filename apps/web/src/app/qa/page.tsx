'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Section } from '../../components/Section';
import { checklistSummary, INTERACTION_CHECKLIST, type InteractionChecklistItem } from '../../lib/qa/checklist';
import { clearQaLogs, markQaFeedback, setQaMode } from '../../lib/demo/runtime-store';
import { useDemoRuntimeState } from '../../lib/demo/use-demo-runtime';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { useTranslation } from '../../lib/i18n/context';

type DetectedInteraction = {
  id: string;
  page: string;
  label: string;
  type: string;
  expectedBehavior: string;
  status: 'Working';
  fixNotes: string;
};

const SCAN_ROUTES = [
  '/',
  '/wallet',
  '/services',
  '/timeline',
  '/inbox',
  '/appointments',
  '/notifications',
  '/settings',
  '/civic-card',
  '/verify',
  '/authority-check'
];

function routeToPage(route: string) {
  if (route === '/') return 'Dashboard';
  if (route === '/wallet') return 'Documents';
  if (route === '/services') return 'Services';
  if (route === '/timeline') return 'Timeline';
  if (route === '/inbox') return 'Inbox';
  if (route === '/appointments') return 'Appointments';
  if (route === '/notifications') return 'Notifications';
  if (route === '/settings') return 'Settings';
  if (route === '/civic-card') return 'Civic Card';
  if (route === '/verify') return 'Verifier';
  if (route === '/authority-check') return 'Authority Check';
  return route;
}

function detectType(element: Element) {
  if (element.tagName === 'A') return 'link';
  if (element.tagName === 'BUTTON') return 'button';
  if (element.tagName === 'SELECT' || element.tagName === 'INPUT') return 'input';
  return element.getAttribute('role') ?? 'interactive';
}

function detectLabel(element: Element) {
  const dataLabel = element.getAttribute('data-qa-label');
  if (dataLabel) return dataLabel;

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const text = element.textContent?.trim();
  if (text) return text.replace(/\s+/g, ' ').slice(0, 90);

  if (element instanceof HTMLAnchorElement) return element.href;
  return element.tagName.toLowerCase();
}

function toDetectedRows(route: string, elements: Element[]) {
  const bySignature = new Map<string, DetectedInteraction>();
  for (const element of elements) {
    const label = detectLabel(element);
    if (!label) continue;
    const type = detectType(element);
    const signature = `${type}::${label}`;
    if (!bySignature.has(signature)) {
      bySignature.set(signature, {
        id: `${route}_${signature}`,
        page: routeToPage(route),
        label,
        type,
        expectedBehavior: 'qa.scan_expected',
        status: 'Working',
        fixNotes: 'qa.scan_fix_notes'
      });
    }
  }
  return [...bySignature.values()];
}

function ChecklistTable({
  items,
  translateText
}: {
  items: InteractionChecklistItem[] | DetectedInteraction[];
  translateText: (value: string) => string;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{translateText('qa.column.page')}</th>
            <th>{translateText('qa.column.label')}</th>
            <th>{translateText('qa.column.type')}</th>
            <th>{translateText('qa.column.expected')}</th>
            <th>{translateText('qa.column.status')}</th>
            <th className="mobile-hide">{translateText('qa.column.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.page}</td>
              <td>{item.label}</td>
              <td>{item.type}</td>
              <td>{translateText(item.expectedBehavior)}</td>
              <td>{item.status}</td>
              <td className="mobile-hide">{translateText(item.fixNotes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function QaPage() {
  const state = useDemoState();
  const runtime = useDemoRuntimeState();
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [scanRoute, setScanRoute] = useState(SCAN_ROUTES[0]);
  const [detectedItems, setDetectedItems] = useState<DetectedInteraction[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const translateValue = (value: string) => {
    if (!value.includes('.')) return value;
    return t(value, undefined, value);
  };

  const summary = useMemo(() => checklistSummary(INTERACTION_CHECKLIST), []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) {
          setDetectedItems([]);
          return;
        }
        const nodes = doc.querySelectorAll(
          'a[href], button, [role="button"], [role="menuitem"], input[type="checkbox"], input[type="radio"], select, summary'
        );
        const rows = toDetectedRows(scanRoute, Array.from(nodes));
        setDetectedItems(rows);
        setScanError(null);
      } catch {
        setScanError('qa.scan_error');
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [scanRoute]);

  if (!state.demoMode) {
    return (
      <Section title={t('qa.page_title')} action={t('settings.demo_badge')}>
        <div className="wallet-empty-card">
          <h3>{t('qa.demo_required_title')}</h3>
          <p>{t('qa.demo_required_desc')}</p>
          <Link href="/settings" className="wallet-action" style={{ textDecoration: 'none' }}>
            {t('qa.open_settings')}
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <>
      <Section title={t('qa.page_title')} action={t('qa.page_action', { working: summary.working, total: summary.total })}>
        <div className="settings-grid">
          <article className="settings-card">
            <div className="badge">{t('qa.mode_badge')}</div>
            <p className="settings-text">{t('qa.mode_desc')}</p>
            <label className="wallet-flow-check">
              <input
                type="checkbox"
                checked={runtime.qa.enabled}
                onChange={(event) => {
                  setQaMode(event.target.checked);
                  markQaFeedback();
                }}
              />
              <span>{runtime.qa.enabled ? t('qa.mode_enabled') : t('qa.mode_disabled')}</span>
            </label>
            <div className="wallet-inline-actions">
              <button
                type="button"
                className="wallet-action wallet-action-soft"
                onClick={() => {
                  clearQaLogs();
                  markQaFeedback();
                }}
              >
                {t('qa.clear_logs')}
              </button>
            </div>
          </article>

          <article className="settings-card">
            <div className="badge">{t('qa.summary_badge')}</div>
            <p className="settings-text">{t('qa.summary_total', { count: summary.total })}</p>
            <p className="settings-text">{t('qa.summary_working', { count: summary.working })}</p>
            <p className="settings-text">{t('qa.summary_broken', { count: summary.broken })}</p>
            <p className="settings-text">{t('qa.summary_missing', { count: summary.missing })}</p>
          </article>

          <article className="settings-card">
            <div className="badge">{t('qa.coverage_badge')}</div>
            <p className="settings-text">
              {t('qa.coverage_desc', { count: runtime.qa.clickLogs.length })}
            </p>
            <Link href="/presenter" className="section-action-link">
              {t('demo.controls.presenter_mode')}
            </Link>
          </article>
        </div>
      </Section>

      <Section title={t('qa.scan_title')} action={t('qa.scan_action')}>
        <div className="qa-scan-controls">
          <label className="wallet-query-label" htmlFor="qa-route">
            {t('qa.scan_route')}
          </label>
          <select
            id="qa-route"
            className="wallet-field"
            value={scanRoute}
            onChange={(event) => setScanRoute(event.target.value)}
          >
            {SCAN_ROUTES.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="wallet-action"
            onClick={() => {
              const iframe = iframeRef.current;
              if (!iframe) return;
              iframe.src = `${scanRoute}?lang=${state.locale}`;
            }}
          >
            {t('qa.scan_refresh')}
          </button>
        </div>
        {scanError ? <p className="wallet-action-error">{t(scanError)}</p> : null}
        <iframe
          ref={iframeRef}
          src={`${scanRoute}?lang=${state.locale}`}
          title="QA route scanner"
          className="qa-scan-frame"
        />
        <ChecklistTable items={detectedItems} translateText={translateValue} />
      </Section>

      <Section title={t('qa.manual_title')} action={t('qa.manual_action')}>
        <ChecklistTable items={INTERACTION_CHECKLIST} translateText={translateValue} />
      </Section>
    </>
  );
}
