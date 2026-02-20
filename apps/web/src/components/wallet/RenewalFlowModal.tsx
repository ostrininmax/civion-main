'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { renewalChecklistForCategory } from '../../lib/wallet-rights';
import { t, ti } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

type RenewalMethod = 'appointment' | 'online';

export type RenewalResult = {
  referenceNumber: string;
  method: RenewalMethod;
  submittedAt: string;
};

export type RenewalDocumentSummary = {
  id: string;
  category: string;
  title: string;
  issuer: string;
};

function generateReference() {
  const numeric = Math.floor(100000 + Math.random() * 900000);
  return `RNW-2026-${numeric}`;
}

export function RenewalFlowModal({
  open,
  document: selectedDocument,
  onClose,
  onComplete
}: {
  open: boolean;
  document: RenewalDocumentSummary | null;
  onClose: () => void;
  onComplete: (result: RenewalResult) => void;
}) {
  const state = useDemoState();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<RenewalMethod>('appointment');
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [referenceNumber, setReferenceNumber] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const checklist = useMemo(
    () => (selectedDocument ? renewalChecklistForCategory(selectedDocument.category, state.locale) : []),
    [selectedDocument, state.locale]
  );

  useEffect(() => {
    if (!open || !selectedDocument) return;

    const nextChecklist = Object.fromEntries(checklist.map((item) => [item, true]));
    setStep(1);
    setMethod('appointment');
    setChecklistState(nextChecklist);
    setReferenceNumber('');
  }, [checklist, open, selectedDocument]);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const originalPosition = window.document.body.style.position;
    const originalTop = window.document.body.style.top;
    const originalWidth = window.document.body.style.width;

    window.document.body.style.position = 'fixed';
    window.document.body.style.top = `-${scrollY}px`;
    window.document.body.style.width = '100%';

    closeButtonRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = window.document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.document.body.style.position = originalPosition;
      window.document.body.style.top = originalTop;
      window.document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open, onClose]);

  if (!open || !selectedDocument) return null;

  const allChecked = checklist.every((item) => checklistState[item]);
  const progressLabel = ti(state.locale, 'wallet.renew_step', { step });

  return (
    <div
      className="wallet-flow-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="wallet-flow-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="renewal-flow-title">
        <div className="wallet-flow-header">
          <div>
            <p className="mono">{progressLabel}</p>
            <h3 id="renewal-flow-title">{ti(state.locale, 'wallet.renew_title', { title: selectedDocument.title })}</h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="wallet-flow-close"
            aria-label={t(state.locale, 'wallet.drawer_close')}
            onClick={onClose}
          >
            {t(state.locale, 'wallet.drawer_close')}
          </button>
        </div>

        {step === 1 ? (
          <div className="wallet-flow-step">
            <p>{t(state.locale, 'wallet.renew_confirm')}</p>
            <div className="wallet-flow-details">
              <p>
                <span>{t(state.locale, 'wallet.renew_document_type')}</span>
                <strong>{selectedDocument.title}</strong>
              </p>
              <p>
                <span>{t(state.locale, 'wallet.renew_issuer')}</span>
                <strong>{selectedDocument.issuer}</strong>
              </p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wallet-flow-step">
            <p>{t(state.locale, 'wallet.renew_checklist')}</p>
            <div className="wallet-flow-checklist">
              {checklist.map((item) => (
                <label key={item} className="wallet-flow-check">
                  <input
                    type="checkbox"
                    checked={Boolean(checklistState[item])}
                    onChange={(event) => setChecklistState((prev) => ({ ...prev, [item]: event.target.checked }))}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wallet-flow-step">
            <p>{t(state.locale, 'wallet.renew_select_method')}</p>
            <label className="wallet-flow-method">
              <input
                type="radio"
                name="renewal-method"
                checked={method === 'appointment'}
                onChange={() => setMethod('appointment')}
              />
              <span>{t(state.locale, 'wallet.renew_method_appointment')}</span>
            </label>
            <label className="wallet-flow-method">
              <input
                type="radio"
                name="renewal-method"
                checked={method === 'online'}
                onChange={() => setMethod('online')}
              />
              <span>{t(state.locale, 'wallet.renew_method_online')}</span>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="wallet-flow-step">
            <p>{t(state.locale, 'wallet.renew_success')}</p>
            <div className="wallet-flow-details">
              <p>
                <span>{t(state.locale, 'wallet.renew_reference')}</span>
                <strong>{referenceNumber}</strong>
              </p>
              <p>
                <span>{t(state.locale, 'wallet.renew_status')}</span>
                <strong>{t(state.locale, 'wallet.renew_status_in_progress')}</strong>
              </p>
              <p>
                <span>{t(state.locale, 'wallet.renew_method')}</span>
                <strong>
                  {method === 'appointment'
                    ? t(state.locale, 'wallet.renew_method_appointment')
                    : t(state.locale, 'wallet.renew_method_online')}
                </strong>
              </p>
            </div>
          </div>
        ) : null}

        <div className="wallet-flow-actions">
          {step > 1 && step < 4 ? (
            <button type="button" className="wallet-action wallet-action-soft" onClick={() => setStep((prev) => prev - 1)}>
              {t(state.locale, 'common.back')}
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              className="wallet-action wallet-action-primary"
              disabled={step === 2 && !allChecked}
              onClick={() => setStep((prev) => prev + 1)}
            >
              {t(state.locale, 'common.continue')}
            </button>
          ) : null}

          {step === 3 ? (
            <button
              type="button"
              className="wallet-action wallet-action-primary"
              onClick={() => {
                const nextReference = generateReference();
                setReferenceNumber(nextReference);
                setStep(4);
              }}
            >
              {t(state.locale, 'wallet.renew_submit')}
            </button>
          ) : null}

          {step === 4 ? (
            <button
              type="button"
              className="wallet-action wallet-action-primary"
              onClick={() => {
                onComplete({
                  referenceNumber,
                  method,
                  submittedAt: new Date().toISOString()
                });
              }}
            >
              {t(state.locale, 'wallet.finish')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
