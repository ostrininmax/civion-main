'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Section } from '../Section';
import { StatusPill } from '../StatusPill';
import { SetReminderButton } from '../actions/SetReminderButton';
import type { WalletDocument } from '../../lib/client-api';
import { appendRecentCheck, type RecentCheck } from '../../lib/recent-checks';
import {
  deriveAggregateRights,
  deriveRightsForDocument,
  lifecycleForExpiry,
  maskDocumentNumber,
  resolveIssuer,
  statusPillForLifecycle,
  toDocumentTitle,
  type BaseDocumentLifecycle,
  type DocumentFilter,
  type DocumentLifecycle
} from '../../lib/wallet-rights';
import { ActiveRightsCard } from './ActiveRightsCard';
import { RecentChecks } from './RecentChecks';
import { DocumentDetailsDrawer, type DrawerDocument } from './DocumentDetailsDrawer';
import { RenewalFlowModal } from './RenewalFlowModal';
import type { DocumentTag, LocaleCode, ShareDuration, ShareFieldKey } from '../../lib/models/types';
import {
  addDocumentRenewalHistory,
  addDocumentShare,
  addVerificationEvent,
  revokeDocumentShare,
  setDocumentInRenewal,
  setDocumentPrimaryTag
} from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { t, ti } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

const cardThemes = [
  'linear-gradient(160deg, rgba(255, 227, 239, 0.97), rgba(225, 234, 255, 0.95))',
  'linear-gradient(160deg, rgba(219, 244, 255, 0.97), rgba(224, 255, 239, 0.95))',
  'linear-gradient(160deg, rgba(233, 230, 255, 0.97), rgba(255, 237, 214, 0.95))'
];

type SortMode = 'expiry' | 'updated' | 'issuer';

type WalletViewDocument = {
  id: string;
  category: string;
  title: string;
  issuer: string;
  expiryDate?: string;
  issueDate?: string;
  filename: string;
  maskedNumber: string;
  baseLifecycle: BaseDocumentLifecycle;
  displayLifecycle: DocumentLifecycle;
  reminderDate?: string;
  tag: DocumentTag;
  lastUpdated: string;
};

function reminderDateFromExpiry(expiryDate?: string) {
  if (!expiryDate) return undefined;
  const date = new Date(expiryDate);
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

function expiresInDays(expiryDate?: string) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function compareBySort(a: WalletViewDocument, b: WalletViewDocument, mode: SortMode) {
  if (mode === 'issuer') {
    return a.issuer.localeCompare(b.issuer);
  }

  if (mode === 'updated') {
    const aUpdated = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
    const bUpdated = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
    return bUpdated - aUpdated;
  }

  const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
  const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
  return aExpiry - bExpiry;
}

function matchesFilter(document: WalletViewDocument, filter: DocumentFilter) {
  if (filter === 'all') return true;
  if (filter === 'expiring') return document.baseLifecycle === 'expiring';
  return document.baseLifecycle === 'expired';
}

function filterHref(filter: DocumentFilter) {
  return filter === 'all' ? '/wallet' : `/wallet?filter=${filter}`;
}

function localizedDocumentStatus(
  locale: LocaleCode,
  lifecycle: DocumentLifecycle
) {
  if (lifecycle === 'in_renewal') return t(locale, 'wallet.status_in_renewal');
  if (lifecycle === 'expired') return t(locale, 'wallet.status_expired');
  if (lifecycle === 'expiring') return t(locale, 'wallet.status_expiring');
  return t(locale, 'wallet.status_active');
}

function localizedTagLabel(locale: LocaleCode, tag: DocumentTag) {
  if (tag === 'identity') return t(locale, 'wallet.folder_identity');
  if (tag === 'migration') return t(locale, 'wallet.folder_migration');
  if (tag === 'finance') return t(locale, 'wallet.folder_finance');
  if (tag === 'health') return t(locale, 'wallet.folder_health');
  return t(locale, 'wallet.folder_business');
}

export function WalletDocumentsClient({
  initialDocuments,
  initialFilter,
  initialChecks,
  initialDocumentId
}: {
  initialDocuments: WalletDocument[];
  initialFilter: DocumentFilter;
  initialChecks: RecentCheck[];
  initialDocumentId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const demoState = useDemoState();
  const { formatDate } = useTranslation();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeFilter, setActiveFilter] = useState<DocumentFilter>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('expiry');
  const [selectedTag, setSelectedTag] = useState<'all' | DocumentTag>('all');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(initialDocumentId ?? null);
  const [renewalDocumentId, setRenewalDocumentId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    setSelectedDocumentId(initialDocumentId ?? null);
  }, [initialDocumentId]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    },
    []
  );

  const sourceDocuments = useMemo(() => {
    if (demoState.documents.length > 0) {
      return demoState.documents.map((item) => ({
        id: item.id,
        category: item.category,
        filename: item.filename,
        issueDate: item.issueDate,
        expiryDate: item.expiryDate,
        issuingAuthority: item.issuer,
        metadata: {
          documentNumber: item.documentNumber,
          fullName: demoState.profile.fullName
        },
        version: 1,
        status: item.status
      })) as WalletDocument[];
    }
    return initialDocuments;
  }, [demoState.documents, demoState.profile.fullName, initialDocuments]);

  const viewDocuments = useMemo<WalletViewDocument[]>(
    () =>
      sourceDocuments.map((item) => {
        const baseLifecycle = lifecycleForExpiry(item.expiryDate);
        const displayLifecycle: DocumentLifecycle = demoState.renewalInProgressDocumentIds.includes(item.id)
          ? 'in_renewal'
          : baseLifecycle;
        const meta = demoState.documentMeta[item.id];

        return {
          id: item.id,
          category: item.category,
          title: t(demoState.locale, `doc.${item.category}`, toDocumentTitle(item.category)),
          issuer: resolveIssuer(item.category, item.issuingAuthority, demoState.locale),
          expiryDate: item.expiryDate,
          issueDate: item.issueDate,
          filename: item.filename,
          maskedNumber: maskDocumentNumber(item.metadata?.documentNumber ?? item.id.slice(-4)),
          baseLifecycle,
          displayLifecycle,
          reminderDate: reminderDateFromExpiry(item.expiryDate),
          tag: meta?.tag ?? 'identity',
          lastUpdated: meta?.lastUpdated ?? item.issueDate ?? new Date().toISOString()
        };
      }),
    [demoState.documentMeta, demoState.locale, demoState.renewalInProgressDocumentIds, sourceDocuments]
  );

  const expiringSoonCount = useMemo(
    () => viewDocuments.filter((item) => item.baseLifecycle === 'expiring').length,
    [viewDocuments]
  );
  const expiredCount = useMemo(
    () => viewDocuments.filter((item) => item.baseLifecycle === 'expired').length,
    [viewDocuments]
  );

  const allRights = useMemo(
    () =>
      deriveAggregateRights(
        viewDocuments.map((item) => ({ category: item.category, lifecycle: item.baseLifecycle })),
        demoState.locale
      ),
    [demoState.locale, viewDocuments]
  );

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return viewDocuments
      .filter((item) => matchesFilter(item, activeFilter))
      .filter((item) => (selectedTag === 'all' ? true : item.tag === selectedTag))
      .filter((item) => {
        if (!normalizedQuery) return true;
        return item.title.toLowerCase().includes(normalizedQuery) || item.issuer.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => compareBySort(a, b, sortMode));
  }, [activeFilter, searchTerm, selectedTag, sortMode, viewDocuments]);

  const selectedDocument = useMemo(
    () => viewDocuments.find((item) => item.id === selectedDocumentId) ?? null,
    [selectedDocumentId, viewDocuments]
  );
  const renewalDocument = useMemo(
    () => viewDocuments.find((item) => item.id === renewalDocumentId) ?? null,
    [renewalDocumentId, viewDocuments]
  );

  const inProgressRenewalsCount = demoState.renewalInProgressDocumentIds.length;

  const selectedDrawerDocument: DrawerDocument | null = selectedDocument
    ? {
        id: selectedDocument.id,
        title: selectedDocument.title,
        issuer: selectedDocument.issuer,
        maskedNumber: selectedDocument.maskedNumber,
        expiryDate: selectedDocument.expiryDate,
        daysRemaining: expiresInDays(selectedDocument.expiryDate),
        statusLabel: localizedDocumentStatus(demoState.locale, selectedDocument.displayLifecycle),
        statusTone: statusPillForLifecycle(selectedDocument.displayLifecycle).tone,
        linkedRights: deriveRightsForDocument(selectedDocument.category, selectedDocument.baseLifecycle, demoState.locale),
        tag: demoState.documentMeta[selectedDocument.id]?.tag ?? selectedDocument.tag,
        verifiedByRegistrySync: demoState.documentMeta[selectedDocument.id]?.verifiedByRegistrySync ?? true,
        lastUpdated: demoState.documentMeta[selectedDocument.id]?.lastUpdated ?? selectedDocument.lastUpdated,
        sharingPermissions: demoState.documentMeta[selectedDocument.id]?.sharingPermissions ?? '1h',
        shares: demoState.documentMeta[selectedDocument.id]?.shares ?? [],
        history: demoState.documentMeta[selectedDocument.id]?.history ?? []
      }
    : null;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  const updateFilter = (next: DocumentFilter) => {
    setActiveFilter(next);
    router.replace(filterHref(next), { scroll: false });
  };

  const openDocumentDrawer = (documentId: string) => {
    setSelectedDocumentId(documentId);
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    params.set('doc', documentId);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const closeDocumentDrawer = () => {
    setSelectedDocumentId(null);
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    params.delete('doc');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleShareProof = async (documentItem: DrawerDocument) => {
    const share = addDocumentShare({
      documentId: documentItem.id,
      duration: '10m',
      fields: ['status', 'validity']
    });

    try {
      await navigator.clipboard.writeText(share.link);
      showToast(t(demoState.locale, 'wallet.toast_share_copied'));
    } catch {
      showToast(t(demoState.locale, 'wallet.toast_share_created'));
    }

    appendRecentCheck({
      verifier: t(demoState.locale, 'wallet.verifier_citizen_app'),
      result: 'Valid',
      dataShown: t(demoState.locale, 'wallet.checks_data_status_validity'),
      source: 'share_proof'
    });
    addVerificationEvent({
      verifier: t(demoState.locale, 'wallet.verifier_citizen_app'),
      result: 'valid',
      dataShown: t(demoState.locale, 'wallet.checks_data_status_validity')
    });
  };

  const handleGenerateShare = async (documentItem: DrawerDocument, duration: ShareDuration, fields: ShareFieldKey[]) => {
    const share = addDocumentShare({
      documentId: documentItem.id,
      duration,
      fields
    });

    try {
      await navigator.clipboard.writeText(share.link);
      showToast(t(demoState.locale, 'wallet.toast_share_copied'));
    } catch {
      showToast(t(demoState.locale, 'wallet.toast_share_created'));
    }

    appendRecentCheck({
      verifier: t(demoState.locale, 'wallet.verifier_citizen_app'),
      result: 'Valid',
      dataShown: fields.includes('issuer')
        ? t(demoState.locale, 'wallet.checks_data_status_validity_issuer')
        : t(demoState.locale, 'wallet.checks_data_status_validity'),
      source: 'share_proof'
    });
  };

  const handleRevokeShare = (documentItem: DrawerDocument, shareId: string) => {
    revokeDocumentShare(documentItem.id, shareId);
    showToast(t(demoState.locale, 'wallet.toast_share_revoked'));
  };

  const handleDownloadPdf = (documentItem: DrawerDocument) => {
    showToast(ti(demoState.locale, 'wallet.toast_download_started', { title: documentItem.title }));
  };

  const handleRequestUpdate = (documentItem: DrawerDocument, reason: string) => {
    appendRecentCheck({
      verifier: resolveIssuer('residence_permit', 'Migration Department', demoState.locale),
      result: 'Valid',
      dataShown: ti(demoState.locale, 'wallet.checks_data_update_request', { reason: reason.slice(0, 48) }),
      source: 'update_request'
    });
    showToast(ti(demoState.locale, 'wallet.toast_update_sent', { title: documentItem.title }));
  };

  return (
    <>
      {toast ? <div className="wallet-toast">{toast}</div> : null}

      <Section title={t(demoState.locale, 'wallet.section_documents')} action={t(demoState.locale, 'wallet.section_documents_action')}>
        <div className="wallet-header-grid">
          <div className="wallet-stat wallet-stat-pink">
            <p className="wallet-stat-label">{t(demoState.locale, 'wallet.stored_documents')}</p>
            <p className="wallet-stat-value">{viewDocuments.length}</p>
          </div>
          <div className="wallet-stat wallet-stat-blue">
            <p className="wallet-stat-label">{t(demoState.locale, 'wallet.expiring_soon')}</p>
            <p className="wallet-stat-value">{expiringSoonCount}</p>
            <button type="button" className="wallet-stat-link wallet-linklike-button" onClick={() => updateFilter('expiring')}>
              {t(demoState.locale, 'wallet.open_list')}
            </button>
          </div>
          <div className="wallet-stat wallet-stat-purple">
            <p className="wallet-stat-label">{t(demoState.locale, 'wallet.expired')}</p>
            <p className="wallet-stat-value">{expiredCount}</p>
            <p className="wallet-stat-text">{t(demoState.locale, 'wallet.renew_docs_hint')}</p>
          </div>
        </div>

        <div className="wallet-upload-shell" data-tour="wallet-registry-sync">
          <div>
            <p className="wallet-upload-title">{t(demoState.locale, 'wallet.registry_sync')}</p>
            <p className="wallet-upload-subtitle">{t(demoState.locale, 'wallet.registry_sync_desc')}</p>
          </div>
          <span className="badge" style={{ opacity: 0.85 }}>
            {t(demoState.locale, 'wallet.read_only_mode')}
          </span>
        </div>
      </Section>

      {inProgressRenewalsCount > 0 ? (
        <div className="card wallet-renewal-banner" role="status">
          {inProgressRenewalsCount === 1
            ? ti(demoState.locale, 'wallet.in_progress_banner', { count: inProgressRenewalsCount })
            : ti(demoState.locale, 'wallet.in_progress_banner_plural', { count: inProgressRenewalsCount })}
        </div>
      ) : null}

      <ActiveRightsCard rights={allRights} />

      <Section title={t(demoState.locale, 'wallet.my_documents')} action={t(demoState.locale, 'wallet.my_documents_action')}>
        <div className="wallet-tools-row">
          <div className="wallet-filter-bar" aria-label={t(demoState.locale, 'wallet.filter_aria')}>
            <button
              type="button"
              className={`wallet-filter-chip ${activeFilter === 'all' ? 'wallet-filter-chip-active' : ''}`}
              onClick={() => updateFilter('all')}
            >
              {t(demoState.locale, 'wallet.filter_all')}
            </button>
            <button
              type="button"
              className={`wallet-filter-chip ${activeFilter === 'expiring' ? 'wallet-filter-chip-active' : ''}`}
              onClick={() => updateFilter('expiring')}
            >
              {t(demoState.locale, 'wallet.filter_expiring')}
            </button>
            <button
              type="button"
              className={`wallet-filter-chip ${activeFilter === 'expired' ? 'wallet-filter-chip-active' : ''}`}
              onClick={() => updateFilter('expired')}
            >
              {t(demoState.locale, 'wallet.filter_expired')}
            </button>
          </div>

          <div className="wallet-query-controls">
            <label className="wallet-query-label" htmlFor="wallet-search">
              {t(demoState.locale, 'wallet.search_label')}
            </label>
            <input
              id="wallet-search"
              className="wallet-field wallet-search-field"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t(demoState.locale, 'wallet.search_placeholder')}
            />
            <label className="wallet-query-label" htmlFor="wallet-sort">
              {t(demoState.locale, 'wallet.sort_label')}
            </label>
            <select
              id="wallet-sort"
              className="wallet-field wallet-sort-field"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="expiry">{t(demoState.locale, 'wallet.sort_expiry')}</option>
              <option value="updated">{t(demoState.locale, 'wallet.sort_updated')}</option>
              <option value="issuer">{t(demoState.locale, 'wallet.sort_issuer')}</option>
            </select>
            <label className="wallet-query-label" htmlFor="wallet-tag">
              {t(demoState.locale, 'wallet.folder_label')}
            </label>
            <select
              id="wallet-tag"
              className="wallet-field wallet-sort-field"
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value as 'all' | DocumentTag)}
            >
              <option value="all">{t(demoState.locale, 'wallet.folder_all')}</option>
              <option value="identity">{t(demoState.locale, 'wallet.folder_identity')}</option>
              <option value="migration">{t(demoState.locale, 'wallet.folder_migration')}</option>
              <option value="finance">{t(demoState.locale, 'wallet.folder_finance')}</option>
              <option value="health">{t(demoState.locale, 'wallet.folder_health')}</option>
              <option value="business">{t(demoState.locale, 'wallet.folder_business')}</option>
            </select>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="wallet-empty-card">
            <h3>{t(demoState.locale, 'wallet.empty_title')}</h3>
            <p>{t(demoState.locale, 'wallet.empty_desc')}</p>
            <button
              type="button"
              className="wallet-action"
              onClick={() => {
                setSearchTerm('');
                setSortMode('expiry');
                setSelectedTag('all');
                updateFilter('all');
              }}
            >
              {t(demoState.locale, 'wallet.show_all')}
            </button>
          </div>
        ) : (
          <div className="wallet-track">
            {filteredDocuments.map((item, index) => {
              const status = statusPillForLifecycle(item.displayLifecycle);
              return (
                <article
                  className="wallet-document-card wallet-document-card-clickable"
                  key={item.id}
                  data-tour={item.id === 'doc-residence' ? 'wallet-residence-card' : undefined}
                  style={{ background: cardThemes[index % cardThemes.length] }}
                  role="button"
                  tabIndex={0}
                  aria-label={ti(demoState.locale, 'wallet.open_details_for', { title: item.title })}
                  onClick={() => openDocumentDrawer(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openDocumentDrawer(item.id);
                    }
                  }}
                >
                  <h3 className="wallet-document-title">{item.title}</h3>
                  <div className="wallet-document-meta">
                    <p>
                      {t(demoState.locale, 'wallet.label_issuer')}: {item.issuer}
                    </p>
                    <p>
                      {t(demoState.locale, 'wallet.label_expiry_date')}:{' '}
                      {item.expiryDate
                        ? formatDate(item.expiryDate, { year: 'numeric', month: 'short', day: '2-digit' })
                        : t(demoState.locale, 'wallet.not_provided')}
                    </p>
                    <p>
                      {t(demoState.locale, 'wallet.label_folder')}: {localizedTagLabel(demoState.locale, item.tag)}
                    </p>
                    <StatusPill label={localizedDocumentStatus(demoState.locale, item.displayLifecycle)} tone={status.tone} />
                  </div>

                  <div className="wallet-document-bottom">
                    <div className="wallet-document-actions">
                      <button
                        className="wallet-action wallet-action-soft"
                        type="button"
                        aria-label={`${t(demoState.locale, 'wallet.action_renew')} ${item.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setRenewalDocumentId(item.id);
                        }}
                      >
                        {t(demoState.locale, 'wallet.action_renew')}
                      </button>
                      <button
                        type="button"
                        className="wallet-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleShareProof({
                            id: item.id,
                            title: item.title,
                            issuer: item.issuer,
                            maskedNumber: item.maskedNumber,
                            expiryDate: item.expiryDate,
                            daysRemaining: expiresInDays(item.expiryDate),
                            statusLabel: localizedDocumentStatus(demoState.locale, item.displayLifecycle),
                            statusTone: statusPillForLifecycle(item.displayLifecycle).tone,
                            linkedRights: deriveRightsForDocument(item.category, item.baseLifecycle, demoState.locale),
                            tag: item.tag,
                            verifiedByRegistrySync: demoState.documentMeta[item.id]?.verifiedByRegistrySync ?? true,
                            lastUpdated: demoState.documentMeta[item.id]?.lastUpdated ?? item.lastUpdated,
                            sharingPermissions: demoState.documentMeta[item.id]?.sharingPermissions ?? '1h',
                            shares: demoState.documentMeta[item.id]?.shares ?? [],
                            history: demoState.documentMeta[item.id]?.history ?? []
                          });
                        }}
                      >
                        {t(demoState.locale, 'wallet.action_share_proof')}
                      </button>
                      <div
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <SetReminderButton
                          title={ti(demoState.locale, 'wallet.reminder_title', { title: item.title })}
                          dueDate={item.reminderDate}
                          severity="important"
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <Section title={t(demoState.locale, 'wallet.recent_checks')} action={t(demoState.locale, 'wallet.recent_checks_action')}>
        <RecentChecks initialChecks={initialChecks} />
      </Section>

      <DocumentDetailsDrawer
        open={Boolean(selectedDrawerDocument)}
        document={selectedDrawerDocument}
        onClose={closeDocumentDrawer}
        onShareProof={handleShareProof}
        onDownloadPdf={handleDownloadPdf}
        onRequestUpdate={handleRequestUpdate}
        onGenerateShare={handleGenerateShare}
        onRevokeShare={handleRevokeShare}
        onTagChange={(documentItem, tag) => {
          setDocumentPrimaryTag(documentItem.id, tag);
          showToast(ti(demoState.locale, 'wallet.toast_folder_updated', { tag: localizedTagLabel(demoState.locale, tag) }));
        }}
      />

      <RenewalFlowModal
        open={Boolean(renewalDocument)}
        document={
          renewalDocument
            ? {
                id: renewalDocument.id,
                category: renewalDocument.category,
                title: renewalDocument.title,
                issuer: renewalDocument.issuer
              }
            : null
        }
        onClose={() => setRenewalDocumentId(null)}
        onComplete={(result) => {
          if (!renewalDocument) return;

          setDocumentInRenewal(renewalDocument.id, true);
          addDocumentRenewalHistory(
            renewalDocument.id,
            ti(demoState.locale, 'wallet.checks_data_renewal_submitted', { reference: result.referenceNumber })
          );
          appendRecentCheck({
            verifier: t(demoState.locale, 'wallet.verifier_cyprus_portal'),
            result: 'Valid',
            dataShown: ti(demoState.locale, 'wallet.checks_data_renewal_submitted', { reference: result.referenceNumber }),
            source: 'renewal'
          });
          addVerificationEvent({
            verifier: t(demoState.locale, 'wallet.verifier_cyprus_portal'),
            result: 'valid',
            dataShown: ti(demoState.locale, 'wallet.checks_data_renewal_submitted', { reference: result.referenceNumber })
          });
          showToast(ti(demoState.locale, 'wallet.toast_renewal_started', { reference: result.referenceNumber }));
          setRenewalDocumentId(null);
        }}
      />
    </>
  );
}
