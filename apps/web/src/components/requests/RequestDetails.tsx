'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '../Breadcrumbs';
import { Section } from '../Section';
import { StatusPill } from '../StatusPill';
import { DemoControlsPanel } from './DemoControlsPanel';
import { statusLabelForRequest, statusToneForRequest } from '../../lib/status';
import { addMessageToThread, withdrawRequest } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import type { RequestStatus } from '../../lib/models/types';
import { localizeAuthority, localizeMessageBody, localizeServiceTitle, t } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';
import { resolveIssuer } from '../../lib/wallet-rights';

const statusOrder: RequestStatus[] = [
  'draft',
  'submitted',
  'appointment_required',
  'in_review',
  'approved',
  'completed'
];

function statusIndex(status: RequestStatus) {
  const index = statusOrder.indexOf(status);
  if (index >= 0) return index;
  if (status === 'rejected') return 3;
  return 0;
}

export function RequestDetails({ requestId }: { requestId: string }) {
  const router = useRouter();
  const state = useDemoState();
  const { locale, t: tt, formatDateTime } = useTranslation();
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  const request = state.requests.find((item) => item.id === requestId);

  const linkedThread = useMemo(
    () => state.messageThreads.find((thread) => thread.linkedRequestId === requestId) ?? null,
    [requestId, state.messageThreads]
  );

  if (!request) {
    return (
      <Section title={tt('requests.not_found_title')} action={tt('requests.not_found_action')}>
        <p style={{ color: 'var(--ink-500)' }}>{tt('requests.not_found_desc')}</p>
        <Link href="/timeline" className="wallet-action" style={{ textDecoration: 'none', marginTop: 10 }}>
          {tt('requests.back_to_timeline')}
        </Link>
      </Section>
    );
  }

  const currentStep = statusIndex(request.status);

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/timeline', label: tt('requests.breadcrumb') },
          { label: request.reference }
        ]}
      />

      <Section title={localizeServiceTitle(locale, request.serviceSlug, request.serviceTitle)} action={request.reference}>
        <div className="request-card-head">
          <p className="mono">{tt('requests.submitted', { date: formatDateTime(request.submittedAt) })}</p>
          <StatusPill label={statusLabelForRequest(request.status, state.locale)} tone={statusToneForRequest(request.status)} />
        </div>

        <ol className="request-stepper" aria-label={tt('requests.status_tracker')}>
          {statusOrder.map((status, index) => (
            <li key={status} className={`request-step ${index <= currentStep ? 'request-step-active' : ''}`}>
              <span className="request-step-dot" aria-hidden />
              <span>{statusLabelForRequest(status, state.locale)}</span>
            </li>
          ))}
        </ol>

        <div className="service-details-actions">
          <button type="button" className="wallet-action" onClick={() => setAddDocOpen(true)}>
            {tt('requests.add_missing_document')}
          </button>
          <Link
            href={`/appointments?requestId=${request.id}`}
            className="wallet-action"
            style={{ textDecoration: 'none' }}
          >
            {tt('requests.reschedule_appointment')}
          </Link>
          <button
            type="button"
            className="wallet-action wallet-action-soft"
            onClick={() => {
              withdrawRequest(request.id);
            }}
          >
            {tt('requests.withdraw_request')}
          </button>
        </div>
      </Section>

      <Section title={tt('requests.submitted_data')} action={tt('requests.summary')}>
        <div className="wallet-flow-details">
          <p>
            <span>{tt('requests.delivery_method')}</span>
            <strong>{request.deliveryMethod === 'online' ? tt('common.online') : tt('common.in_person')}</strong>
          </p>
          <p>
            <span>{tt('requests.payment_label')}</span>
            <strong>{request.feePaid ? tt('requests.payment_paid', { amount: request.paymentAmount }) : tt('requests.payment_not_paid')}</strong>
          </p>
          <p>
            <span>{tt('requests.last_update')}</span>
            <strong>{formatDateTime(request.updatedAt)}</strong>
          </p>
        </div>
      </Section>

      <Section title={tt('requests.attached_documents')} action={tt('common.items_count', { count: request.attachedDocumentIds.length })}>
        <ul className="request-upload-list">
          {request.attachedDocumentIds.map((id) => {
            const document = state.documents.find((item) => item.id === id);
            return (
              <li key={id}>
                {document
                  ? `${t(locale, `doc.${document.category}`, document.title)} (${resolveIssuer(document.category, document.issuer, locale)})`
                  : id}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section
        title={tt('requests.messages')}
        action={linkedThread ? localizeAuthority(locale, linkedThread.authority) : tt('requests.no_thread')}
      >
        {!linkedThread ? (
          <div className="wallet-empty-card">
            <h3>{tt('requests.no_thread')}</h3>
            <p>{tt('requests.no_thread_desc')}</p>
          </div>
        ) : (
          <div className="request-messages">
            {linkedThread.messages.slice(-6).map((message) => (
              <article
                key={message.id}
                className={`message-bubble ${message.from === 'citizen' ? 'message-bubble-citizen' : ''}`}
              >
                <p>{localizeMessageBody(locale, message.body)}</p>
                <small>{formatDateTime(message.at)}</small>
              </article>
            ))}
            <Link href={`/inbox?thread=${linkedThread.id}`} className="wallet-action" style={{ textDecoration: 'none' }}>
              {tt('requests.open_full_conversation')}
            </Link>
          </div>
        )}
      </Section>

      {state.demoMode ? <DemoControlsPanel requestId={request.id} currentStatus={request.status} /> : null}

      {addDocOpen ? (
        <div className="wallet-inline-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setAddDocOpen(false)}>
          <div className="wallet-inline-modal" role="dialog" aria-modal="true" aria-labelledby="add-doc-title">
            <h4 id="add-doc-title">{tt('requests.add_doc_title')}</h4>
            <label className="wallet-inline-label" htmlFor="add-doc-select">
              {tt('requests.select_doc')}
            </label>
            <select
              id="add-doc-select"
              className="wallet-field"
              value={selectedDocumentId}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
            >
              <option value="">{tt('requests.choose_doc')}</option>
              {state.documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {t(locale, `doc.${document.category}`, document.title)}
                </option>
              ))}
            </select>
            <div className="wallet-inline-actions">
              <button type="button" className="wallet-action wallet-action-soft" onClick={() => setAddDocOpen(false)}>
                {tt('common.cancel')}
              </button>
              <button
                type="button"
                className="wallet-action wallet-action-primary"
                disabled={!selectedDocumentId || !linkedThread}
                onClick={() => {
                  if (!selectedDocumentId || !linkedThread) return;
                  const document = state.documents.find((item) => item.id === selectedDocumentId);
                  const canonicalTitle = document
                    ? t('en', `doc.${document.category}`, document.title)
                    : selectedDocumentId;
                  addMessageToThread({
                    threadId: linkedThread.id,
                    from: 'citizen',
                    body: `Attached additional document: ${canonicalTitle}`,
                    attachments: document
                      ? [
                          {
                            documentId: document.id,
                            title: canonicalTitle
                          }
                        ]
                      : []
                  });
                  setSelectedDocumentId('');
                  setAddDocOpen(false);
                  router.push(`/inbox?thread=${linkedThread.id}`);
                }}
              >
                {tt('requests.submit_doc')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
