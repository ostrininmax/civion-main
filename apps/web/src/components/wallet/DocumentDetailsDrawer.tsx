'use client';

import { useEffect, useRef, useState } from 'react';
import { StatusPill } from '../StatusPill';
import type { DocumentHistoryEvent, DocumentTag, DocumentShareRecord, LocaleCode, ShareDuration, ShareFieldKey } from '../../lib/models/types';
import type { DerivedRight } from '../../lib/wallet-rights';
import { t, ti } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';
import { useDemoState } from '../../lib/storage/use-demo-state';

type StatusTone = 'neutral' | 'success' | 'warning' | 'critical';

export type DrawerDocument = {
  id: string;
  title: string;
  issuer: string;
  maskedNumber: string;
  expiryDate?: string;
  daysRemaining: number | null;
  statusLabel: string;
  statusTone: StatusTone;
  linkedRights: DerivedRight[];
  tag: DocumentTag;
  verifiedByRegistrySync: boolean;
  lastUpdated: string;
  sharingPermissions: ShareDuration;
  shares: DocumentShareRecord[];
  history: DocumentHistoryEvent[];
};

function historyTypeLabel(locale: LocaleCode, type: DocumentHistoryEvent['type']) {
  if (type === 'created') return t(locale, 'wallet.history_event_created');
  if (type === 'shared') return t(locale, 'wallet.history_event_shared');
  if (type === 'verified') return t(locale, 'wallet.history_event_verified');
  if (type === 'renewal_attempt') return t(locale, 'wallet.history_event_renewed');
  if (type === 'share_revoked') return t(locale, 'wallet.history_event_revoked');
  return t(locale, 'wallet.history_event_updated');
}

function historyMetaLabel(locale: LocaleCode, meta?: string) {
  if (!meta) return '';
  if (meta === 'Seeded document') return t(locale, 'wallet.history_meta_registry_seed');
  if (meta === 'Government registry seed') return t(locale, 'wallet.history_meta_registry_seed');
  if (meta === 'Registry sync check') return t(locale, 'wallet.history_meta_registry_sync_check');
  if (meta === 'Government Registry Sync') return t(locale, 'wallet.history_meta_registry_sync_check');
  return meta;
}

const durations: ShareDuration[] = ['10m', '1h', '24h'];

const shareFieldOptions: ShareFieldKey[] = ['status', 'validity', 'issuer', 'document_type'];

const tagOptions: DocumentTag[] = ['identity', 'migration', 'finance', 'health', 'business'];

export function DocumentDetailsDrawer({
  open,
  document: selectedDocument,
  isLocked = false,
  onClose,
  onShareProof,
  onDownloadPdf,
  onRequestUpdate,
  onGenerateShare,
  onRevokeShare,
  onTagChange
}: {
  open: boolean;
  document: DrawerDocument | null;
  isLocked?: boolean;
  onClose: () => void;
  onShareProof: (document: DrawerDocument) => Promise<void> | void;
  onDownloadPdf: (document: DrawerDocument) => void;
  onRequestUpdate: (document: DrawerDocument, reason: string) => void;
  onGenerateShare: (document: DrawerDocument, duration: ShareDuration, fields: ShareFieldKey[]) => Promise<void> | void;
  onRevokeShare: (document: DrawerDocument, shareId: string) => void;
  onTagChange: (document: DrawerDocument, tag: DocumentTag) => void;
}) {
  const state = useDemoState();
  const { formatDateTime } = useTranslation();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [sharePending, setSharePending] = useState(false);
  const [duration, setDuration] = useState<ShareDuration>('10m');
  const [fields, setFields] = useState<Record<ShareFieldKey, boolean>>({
    status: true,
    validity: true,
    issuer: false,
    document_type: false
  });

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedDocument) return;
    setDuration(selectedDocument.sharingPermissions);
  }, [selectedDocument]);

  useEffect(() => {
    if (!open) {
      setRequestModalOpen(false);
      setRequestReason('');
      setSharePending(false);
      return;
    }

    const scrollY = window.scrollY;
    const originalPosition = window.document.body.style.position;
    const originalTop = window.document.body.style.top;
    const originalWidth = window.document.body.style.width;

    window.document.body.style.position = 'fixed';
    window.document.body.style.top = `-${scrollY}px`;
    window.document.body.style.width = '100%';

    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (requestModalOpen) {
          setRequestModalOpen(false);
          return;
        }
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const root = drawerRef.current;
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
  }, [onClose, open, requestModalOpen]);

  if (!open || !selectedDocument) return null;

  const selectedFields = shareFieldOptions.filter((key) => fields[key]) as ShareFieldKey[];

  const durationLabel: Record<ShareDuration, string> = {
    '10m': t(state.locale, 'wallet.duration_10m'),
    '1h': t(state.locale, 'wallet.duration_1h'),
    '24h': t(state.locale, 'wallet.duration_24h')
  };

  const fieldLabel: Record<ShareFieldKey, string> = {
    status: t(state.locale, 'wallet.drawer_share_field_status'),
    validity: t(state.locale, 'wallet.drawer_share_field_validity'),
    issuer: t(state.locale, 'wallet.drawer_share_field_issuer'),
    document_type: t(state.locale, 'wallet.drawer_share_field_document_type')
  };

  const tagLabel: Record<DocumentTag, string> = {
    identity: t(state.locale, 'wallet.folder_identity'),
    migration: t(state.locale, 'wallet.folder_migration'),
    finance: t(state.locale, 'wallet.folder_finance'),
    health: t(state.locale, 'wallet.folder_health'),
    business: t(state.locale, 'wallet.folder_business')
  };

  return (
    <div
      className="wallet-drawer-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="wallet-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="wallet-drawer-title" ref={drawerRef}>
        <div className="wallet-drawer-head">
          <div>
            <h3 id="wallet-drawer-title">{selectedDocument.title}</h3>
            <StatusPill label={selectedDocument.statusLabel} tone={selectedDocument.statusTone} />
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="wallet-drawer-close"
            aria-label={t(state.locale, 'wallet.drawer_close')}
            onClick={onClose}
          >
            {t(state.locale, 'wallet.drawer_close')}
          </button>
        </div>

        <div className="wallet-drawer-grid">
          <p className="wallet-drawer-row">
            <span>{t(state.locale, 'wallet.label_issuer')}</span>
            <strong>{selectedDocument.issuer}</strong>
          </p>
          <p className="wallet-drawer-row">
            <span>{t(state.locale, 'wallet.drawer_document_number')}</span>
            <strong>{selectedDocument.maskedNumber}</strong>
          </p>
          <p className="wallet-drawer-row">
            <span>{t(state.locale, 'wallet.label_expiry_date')}</span>
            <strong>
              {selectedDocument.expiryDate
                ? formatDateTime(selectedDocument.expiryDate, { year: 'numeric', month: 'short', day: '2-digit' })
                : t(state.locale, 'wallet.not_provided')}
            </strong>
          </p>
          <p className="wallet-drawer-row">
            <span>{t(state.locale, 'wallet.drawer_days_remaining')}</span>
            <strong>
              {selectedDocument.daysRemaining === null
                ? t(state.locale, 'wallet.not_provided')
                : selectedDocument.daysRemaining < 0
                  ? ti(state.locale, 'wallet.drawer_days_overdue', { days: Math.abs(selectedDocument.daysRemaining) })
                  : ti(state.locale, 'wallet.drawer_days', { days: selectedDocument.daysRemaining })}
            </strong>
          </p>
          <p className="wallet-drawer-row">
            <span>{t(state.locale, 'wallet.drawer_folder_tag')}</span>
            <strong>{tagLabel[selectedDocument.tag]}</strong>
          </p>
        </div>

        <div className="wallet-drawer-section">
          <h4>{t(state.locale, 'wallet.drawer_verification_metadata')}</h4>
          <p>
            {t(state.locale, 'wallet.drawer_source')}: {t(state.locale, 'wallet.drawer_source_registry')} (
            {selectedDocument.verifiedByRegistrySync ? t(state.locale, 'wallet.verified') : t(state.locale, 'wallet.pending')})
          </p>
          <p>
            {t(state.locale, 'wallet.drawer_last_updated')}: {formatDateTime(selectedDocument.lastUpdated)}
          </p>
        </div>

        <div className="wallet-drawer-section">
          <h4>{t(state.locale, 'wallet.drawer_folder_tag')}</h4>
          <select
            className="wallet-field"
            value={selectedDocument.tag}
            onChange={(event) => onTagChange(selectedDocument, event.target.value as DocumentTag)}
          >
            {tagOptions.map((option) => (
              <option key={option} value={option}>
                {tagLabel[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="wallet-drawer-section" data-tour="drawer-linked-rights">
          <h4>{t(state.locale, 'wallet.drawer_linked_rights')}</h4>
          <div className="wallet-rights-chips">
            {selectedDocument.linkedRights.length === 0 ? (
              <span className="wallet-right-chip wallet-right-chip-muted">{t(state.locale, 'wallet.drawer_no_linked_rights')}</span>
            ) : (
              selectedDocument.linkedRights.map((right) => (
                <span
                  key={right.id}
                  className={`wallet-right-chip ${right.active ? '' : 'wallet-right-chip-muted'}`}
                  title={right.active ? undefined : right.reason ?? t(state.locale, 'wallet.document_expired')}
                >
                  {right.label}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="wallet-drawer-section" data-tour="drawer-share-controls">
          <h4>{t(state.locale, 'wallet.drawer_sharing_controls')}</h4>
          {isLocked ? <p className="civic-verify-reason">{t(state.locale, 'authority.invalid_locked')}</p> : null}
          <label className="wallet-query-label" htmlFor="share-duration">
            {t(state.locale, 'wallet.drawer_share_duration')}
          </label>
          <select id="share-duration" className="wallet-field" value={duration} onChange={(event) => setDuration(event.target.value as ShareDuration)}>
            {durations.map((option) => (
              <option key={option} value={option}>
                {durationLabel[option]}
              </option>
            ))}
          </select>

          <div className="wallet-flow-checklist">
            {shareFieldOptions.map((option) => (
              <label key={option} className="wallet-flow-check">
                <input
                  type="checkbox"
                  checked={fields[option]}
                  onChange={(event) => setFields((prev) => ({ ...prev, [option]: event.target.checked }))}
                />
                <span>{fieldLabel[option]}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            className="wallet-action wallet-action-primary"
            disabled={selectedFields.length === 0 || sharePending || isLocked}
            onClick={async () => {
              setSharePending(true);
              try {
                await onGenerateShare(selectedDocument, duration, selectedFields);
              } finally {
                setSharePending(false);
              }
            }}
          >
            {sharePending ? t(state.locale, 'wallet.drawer_generating_share') : t(state.locale, 'wallet.drawer_generate_share')}
          </button>

          <div className="wallet-share-list">
            {selectedDocument.shares.length === 0 ? (
              <p className="wallet-log-meta">{t(state.locale, 'wallet.drawer_no_active_shares')}</p>
            ) : (
              selectedDocument.shares.map((share) => (
                <article key={share.id} className="wallet-share-item">
                  <p>{share.link}</p>
                  <small>
                    {share.revoked
                      ? t(state.locale, 'wallet.drawer_share_revoked')
                      : ti(state.locale, 'wallet.drawer_share_active_until', { date: formatDateTime(share.expiresAt) })}{' '}
                    · {t(state.locale, 'wallet.fields')}: {share.fields.map((field) => fieldLabel[field]).join(', ')}
                  </small>
                  {!share.revoked ? (
                    <button type="button" className="wallet-action wallet-action-soft" onClick={() => onRevokeShare(selectedDocument, share.id)}>
                      {t(state.locale, 'wallet.drawer_revoke_link')}
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="wallet-drawer-section">
          <h4>{t(state.locale, 'wallet.drawer_document_history')}</h4>
          <div className="wallet-history-list">
            {selectedDocument.history.slice(0, 8).map((event) => (
              <article key={event.id} className="wallet-history-item">
                <p>
                  <strong>{historyTypeLabel(state.locale, event.type)}</strong>
                </p>
                <small>
                  {formatDateTime(event.at)}
                  {event.meta ? ` · ${historyMetaLabel(state.locale, event.meta)}` : ''}
                </small>
              </article>
            ))}
          </div>
        </div>

        <div className="wallet-drawer-actions">
          <button
            type="button"
            className="wallet-action wallet-action-primary"
            onClick={async () => {
              setSharePending(true);
              try {
                await onShareProof(selectedDocument);
              } finally {
                setSharePending(false);
              }
            }}
            disabled={sharePending || isLocked}
          >
            {sharePending ? t(state.locale, 'wallet.drawer_generating_share') : t(state.locale, 'wallet.action_share_proof')}
          </button>
          <button type="button" className="wallet-action" onClick={() => onDownloadPdf(selectedDocument)}>
            {t(state.locale, 'wallet.drawer_download_pdf')}
          </button>
          <button type="button" className="wallet-action wallet-action-soft" onClick={() => setRequestModalOpen(true)}>
            {t(state.locale, 'wallet.drawer_request_update')}
          </button>
        </div>
      </aside>

      {requestModalOpen ? (
        <div
          className="wallet-inline-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRequestModalOpen(false);
            }
          }}
        >
          <div className="wallet-inline-modal" role="dialog" aria-modal="true" aria-labelledby="request-update-title">
            <h4 id="request-update-title">{t(state.locale, 'wallet.request_update_title')}</h4>
            <label className="wallet-inline-label" htmlFor="request-update-reason">
              {t(state.locale, 'wallet.request_reason')}
            </label>
            <textarea
              id="request-update-reason"
              className="wallet-inline-textarea"
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder={t(state.locale, 'wallet.request_reason_placeholder')}
              rows={4}
              autoFocus
            />
            <div className="wallet-inline-actions">
              <button type="button" className="wallet-action wallet-action-soft" onClick={() => setRequestModalOpen(false)}>
                {t(state.locale, 'common.cancel')}
              </button>
              <button
                type="button"
                className="wallet-action wallet-action-primary"
                disabled={requestReason.trim().length < 4}
                onClick={() => {
                  onRequestUpdate(selectedDocument, requestReason.trim());
                  setRequestReason('');
                  setRequestModalOpen(false);
                }}
              >
                {t(state.locale, 'wallet.submit_request')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
