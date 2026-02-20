'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CitizenDocument, LocaleCode, ServiceDefinition, UserProfile } from '../../lib/models/types';
import { createRequestFromWizard, setDocumentInRenewal } from '../../lib/storage/demo-store';
import { statusLabelForRequest } from '../../lib/status';
import { localizeServiceRequirement, localizeServiceTitle, t, ti } from '../../lib/i18n';

type DeliveryMethod = 'online' | 'in_person';

type WizardStep = 1 | 2 | 3 | 4 | 5;

function requirementMatchesDocument(requirement: string, document: CitizenDocument) {
  const requirementLc = requirement.toLowerCase();
  const titleLc = document.title.toLowerCase();
  const categoryLc = document.category.toLowerCase();

  return (
    requirementLc.includes(titleLc.split(' ')[0]) ||
    requirementLc.includes(categoryLc.replace('_', ' ')) ||
    titleLc.includes(requirementLc.split(' ')[0])
  );
}

export function RequestWizard({
  open,
  service,
  documents,
  profile,
  locale,
  onClose,
  onSubmitted
}: {
  open: boolean;
  service: ServiceDefinition | null;
  documents: CitizenDocument[];
  profile: UserProfile;
  locale: LocaleCode;
  onClose: () => void;
  onSubmitted: (requestId: string) => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('online');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [uploadedItems, setUploadedItems] = useState<string[]>([]);
  const [uploadInput, setUploadInput] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [createdReference, setCreatedReference] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !service) return;

    setStep(1);
    setDeliveryMethod(service.mode === 'in_person' ? 'in_person' : 'online');
    setPaymentConfirmed(service.feeEur === 0);
    setCreatedRequestId(null);
    setCreatedReference('');
    setUploadInput('');
    setUploadedItems([]);

    const preselected = documents
      .filter((document) => service.requirements.some((requirement) => requirementMatchesDocument(requirement, document)))
      .map((document) => document.id);
    setSelectedDocumentIds(Array.from(new Set(preselected)));
  }, [documents, open, service]);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const root = modalRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open, onClose]);

  const canContinue = useMemo(() => {
    if (!service) return false;
    if (step === 2) return selectedDocumentIds.length > 0 || uploadedItems.length > 0;
    if (step === 4) return paymentConfirmed;
    return true;
  }, [paymentConfirmed, selectedDocumentIds.length, service, step, uploadedItems.length]);

  if (!open || !service) return null;

  return (
    <div
      className="wallet-flow-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="wallet-flow-modal" role="dialog" aria-modal="true" aria-labelledby="request-wizard-title" ref={modalRef}>
        <div className="wallet-flow-header">
          <div>
            <p className="mono">{ti(locale, 'wizard.step_of', { step })}</p>
            <h3 id="request-wizard-title">{ti(locale, 'wizard.start', { title: localizeServiceTitle(locale, service.slug, service.title) })}</h3>
          </div>
          <button type="button" className="wallet-flow-close" onClick={onClose} aria-label={t(locale, 'wizard.close_aria')}>
            {t(locale, 'common.close')}
          </button>
        </div>

        {step === 1 ? (
          <div className="wallet-flow-step">
            <p>{t(locale, 'wizard.confirm_details')}</p>
            <div className="wallet-flow-details">
              <p>
                <span>{t(locale, 'wizard.full_name')}</span>
                <strong>{profile.fullName}</strong>
              </p>
              <p>
                <span>{t(locale, 'wizard.date_of_birth')}</span>
                <strong>{profile.dateOfBirth}</strong>
              </p>
              <p>
                <span>{t(locale, 'wizard.address')}</span>
                <strong>{profile.address}</strong>
              </p>
              <p>
                <span>{t(locale, 'wizard.contact')}</span>
                <strong>{profile.phone}</strong>
              </p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wallet-flow-step">
            <p>{t(locale, 'wizard.attach_required')}</p>
            <div className="request-requirements-grid">
              {service.requirements.map((requirement) => (
                <article key={requirement} className="request-requirement-card">
                  <h4>{localizeServiceRequirement(locale, requirement)}</h4>
                  <div className="request-requirement-options">
                    {documents
                      .filter((document) => requirementMatchesDocument(requirement, document))
                      .map((document) => (
                        <label key={document.id} className="wallet-flow-check">
                          <input
                            type="checkbox"
                            checked={selectedDocumentIds.includes(document.id)}
                            onChange={(event) => {
                              setSelectedDocumentIds((prev) =>
                                event.target.checked ? [...prev, document.id] : prev.filter((id) => id !== document.id)
                              );
                            }}
                          />
                          <span>
                            {t(locale, `doc.${document.category}`, document.title)} ({document.issuer})
                          </span>
                        </label>
                      ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="request-upload-row">
              <input
                value={uploadInput}
                onChange={(event) => setUploadInput(event.target.value)}
                placeholder={t(locale, 'wizard.mock_upload_placeholder')}
                className="wallet-field"
                aria-label={t(locale, 'wizard.mock_upload_placeholder')}
              />
              <button
                type="button"
                className="wallet-action"
                onClick={() => {
                  const trimmed = uploadInput.trim();
                  if (!trimmed) return;
                  setUploadedItems((prev) => [...prev, trimmed]);
                  setUploadInput('');
                }}
              >
                {t(locale, 'wizard.add_upload')}
              </button>
            </div>
            {uploadedItems.length > 0 ? (
              <ul className="request-upload-list">
                {uploadedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wallet-flow-step">
            <p>{t(locale, 'wizard.choose_delivery')}</p>
            <label className="wallet-flow-method">
              <input
                type="radio"
                name="delivery-method"
                checked={deliveryMethod === 'online'}
                onChange={() => setDeliveryMethod('online')}
                disabled={service.mode === 'in_person'}
              />
              <span>{t(locale, 'wizard.delivery_online')}</span>
            </label>
            <label className="wallet-flow-method">
              <input
                type="radio"
                name="delivery-method"
                checked={deliveryMethod === 'in_person'}
                onChange={() => setDeliveryMethod('in_person')}
                disabled={service.mode === 'online'}
              />
              <span>{t(locale, 'wizard.delivery_in_person')}</span>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="wallet-flow-step">
            {service.feeEur > 0 ? (
              <>
                <p>{t(locale, 'wizard.payment_required')}</p>
                <div className="wallet-flow-details">
                  <p>
                    <span>{t(locale, 'wizard.service_fee')}</span>
                    <strong>€{service.feeEur}</strong>
                  </p>
                </div>
                <label className="wallet-flow-check">
                  <input
                    type="checkbox"
                    checked={paymentConfirmed}
                    onChange={(event) => setPaymentConfirmed(event.target.checked)}
                  />
                  <span>{t(locale, 'wizard.mock_payment_done')}</span>
                </label>
              </>
            ) : (
              <div className="wallet-flow-details">
                <p>
                  <span>{t(locale, 'wizard.payment')}</span>
                  <strong>{t(locale, 'services.no_payment_required')}</strong>
                </p>
              </div>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="wallet-flow-step">
            <p>{t(locale, 'wizard.request_submitted')}</p>
            <div className="wallet-flow-details">
              <p>
                <span>{t(locale, 'wizard.reference_number')}</span>
                <strong>{createdReference}</strong>
              </p>
              <p>
                <span>{t(locale, 'wallet.renew_status')}</span>
                <strong>
                  {createdRequestId
                    ? statusLabelForRequest(
                        (service.requiresAppointment && deliveryMethod === 'in_person') || !createdRequestId
                          ? 'appointment_required'
                          : 'submitted',
                        locale
                      )
                    : statusLabelForRequest('submitted', locale)}
                </strong>
              </p>
            </div>
            {createdRequestId ? (
              <Link href={`/timeline/${createdRequestId}`} className="wallet-action wallet-action-primary" onClick={onClose}>
                {t(locale, 'wizard.open_request_tracking')}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="wallet-flow-actions">
          <button
            type="button"
            className="wallet-action wallet-action-soft"
            onClick={() => {
              if (step === 1) {
                onClose();
              } else {
                setStep((current) => (current - 1) as WizardStep);
              }
            }}
          >
            {step === 1 ? t(locale, 'common.cancel') : t(locale, 'common.back')}
          </button>

          {step < 4 ? (
            <button
              type="button"
              className="wallet-action wallet-action-primary"
              onClick={() => setStep((current) => (current + 1) as WizardStep)}
              disabled={!canContinue}
            >
              {t(locale, 'common.continue')}
            </button>
          ) : null}

          {step === 4 ? (
            <button
              type="button"
              className="wallet-action wallet-action-primary"
              disabled={!canContinue}
              onClick={() => {
                const created = createRequestFromWizard({
                  serviceSlug: service.slug,
                  attachedDocumentIds: [...selectedDocumentIds, ...uploadedItems.map((item) => `mock-upload:${item}`)],
                  deliveryMethod,
                  feePaid: service.feeEur === 0 ? true : paymentConfirmed
                });
                if (!created) return;

                if (service.slug.includes('renewal')) {
                  const targetId = selectedDocumentIds.find((id) => id.includes('residence')) ?? 'doc-residence';
                  setDocumentInRenewal(targetId, true);
                }

                setCreatedRequestId(created.id);
                setCreatedReference(created.reference);
                setStep(5);
                onSubmitted(created.id);
              }}
            >
              {t(locale, 'wizard.submit_request')}
            </button>
          ) : null}

          {step === 5 ? (
            <button type="button" className="wallet-action wallet-action-primary" onClick={onClose}>
              {t(locale, 'wallet.finish')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
