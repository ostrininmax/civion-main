import type {
  AccountSecurityState,
  AppNotification,
  Appointment,
  CitizenDocument,
  DemoState,
  DeviceSession,
  FailedVerificationAttempt,
  DocumentTag,
  DocumentHistoryEvent,
  DocumentShareRecord,
  MessageThread,
  RequestStatus,
  SecurityLockHistoryEvent,
  SecurityLockType,
  ServiceRequest,
  ShareLink,
  ShareDuration,
  ShareFieldKey,
  VerificationEvent
} from '../models/types';
import { createInitialDemoState } from '../mockData/demo-seed';
import { SERVICE_DEFINITIONS } from '../mockData/definitions';

const STORAGE_KEY = 'cyprus-services.demo-state.v5';
const STORE_EVENT = 'cyprus-services:demo-state-updated';
const DEFAULT_SECURITY_PIN = '2580';
const LOCK_DURATION_1H_MS = 60 * 60 * 1000;
const LOCK_DURATION_24H_MS = 24 * 60 * 60 * 1000;

type StoreListener = () => void;

const listeners = new Set<StoreListener>();

let memoryState: DemoState | null = null;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function cloneState(state: DemoState): DemoState {
  return JSON.parse(JSON.stringify(state)) as DemoState;
}

function emitChange() {
  for (const listener of listeners) listener();
}

function persist(state: DemoState) {
  memoryState = state;
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent(STORE_EVENT));
    } catch {
      // Ignore storage failures in demo mode.
    }
  }
  emitChange();
}

function inferTag(document: CitizenDocument): DocumentTag {
  if (document.tags.length > 0) return document.tags[0];
  if (document.category.includes('health')) return 'health';
  if (document.category.includes('tax') || document.category.includes('bank')) return 'finance';
  if (document.category.includes('company') || document.category.includes('business')) return 'business';
  if (document.category.includes('residence') || document.category.includes('address')) return 'migration';
  return 'identity';
}

function ensureDocumentMetaForDocument(state: DemoState, document: CitizenDocument) {
  if (state.documentMeta[document.id]) return;
  const nowIso = new Date().toISOString();
  state.documentMeta[document.id] = {
    documentId: document.id,
    tag: inferTag(document),
    lastUpdated: document.lastUpdated ?? nowIso,
    verifiedByRegistrySync: true,
    sharingPermissions: '1h',
    shares: [],
    history: [
      {
        id: makeId('dh'),
        documentId: document.id,
        type: 'created',
        at: document.issueDate ?? nowIso,
        meta: 'Seeded document'
      },
      {
        id: makeId('dh'),
        documentId: document.id,
        type: 'verified',
        at: document.lastUpdated ?? nowIso,
        meta: 'Government Registry Sync'
      }
    ]
  };
}

function defaultDeviceSessions(nowIso: string): DeviceSession[] {
  return [
    {
      id: 'sess_web_primary',
      deviceName: 'MacBook Pro (Chrome)',
      deviceType: 'laptop',
      location: 'Nicosia, Cyprus',
      ipMasked: '85.129.*.*',
      lastSeenAt: nowIso,
      addedAt: new Date(Date.now() - LOCK_DURATION_24H_MS * 16).toISOString(),
      isCurrent: true,
      isTrusted: true,
      status: 'current'
    },
    {
      id: 'sess_mobile',
      deviceName: 'iPhone 15 Pro (Safari)',
      deviceType: 'phone',
      location: 'Larnaca, Cyprus',
      ipMasked: '92.63.*.*',
      lastSeenAt: nowIso,
      addedAt: new Date(Date.now() - LOCK_DURATION_24H_MS * 24).toISOString(),
      isCurrent: false,
      isTrusted: true,
      status: 'trusted'
    },
    {
      id: 'sess_suspicious',
      deviceName: 'Unknown Android Device',
      deviceType: 'phone',
      location: 'Cairo, Egypt',
      ipMasked: '41.32.*.*',
      lastSeenAt: new Date(Date.now() - LOCK_DURATION_24H_MS * 10).toISOString(),
      addedAt: new Date(Date.now() - LOCK_DURATION_24H_MS * 10).toISOString(),
      isCurrent: false,
      isTrusted: false,
      status: 'suspicious'
    }
  ];
}

function inferDeviceTypeFromLegacy(value: unknown): DeviceSession['deviceType'] {
  if (value === 'phone' || value === 'laptop' || value === 'tablet') return value;
  if (value === 'mobile') return 'phone';
  if (value === 'web') return 'laptop';
  if (value === 'tablet') return 'tablet';
  return 'laptop';
}

function normalizeSession(candidate: unknown, fallbackIndex: number, fallbackNowIso: string): DeviceSession {
  const raw = candidate && typeof candidate === 'object' ? (candidate as Partial<DeviceSession> & Record<string, unknown>) : {};
  const legacyChannel = raw.channel;
  const deviceType = inferDeviceTypeFromLegacy(raw.deviceType ?? legacyChannel);
  const fallbackName = deviceType === 'phone' ? 'Mobile Device' : deviceType === 'tablet' ? 'Tablet Device' : 'Desktop Browser';
  const isCurrent = typeof raw.isCurrent === 'boolean' ? raw.isCurrent : Boolean(raw.active && fallbackIndex === 0);
  const isTrusted = typeof raw.isTrusted === 'boolean' ? raw.isTrusted : Boolean(raw.active);

  let status: DeviceSession['status'];
  if (raw.status === 'current' || raw.status === 'trusted' || raw.status === 'new' || raw.status === 'suspicious') {
    status = raw.status;
  } else if (isCurrent) {
    status = 'current';
  } else if (isTrusted) {
    status = 'trusted';
  } else {
    status = 'new';
  }

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `sess_${fallbackIndex}`,
    deviceName:
      (typeof raw.deviceName === 'string' && raw.deviceName) ||
      (typeof raw.device === 'string' && raw.device) ||
      fallbackName,
    deviceType,
    location: typeof raw.location === 'string' && raw.location ? raw.location : 'Unknown location',
    ipMasked: typeof raw.ipMasked === 'string' ? raw.ipMasked : undefined,
    lastSeenAt: typeof raw.lastSeenAt === 'string' && raw.lastSeenAt ? raw.lastSeenAt : fallbackNowIso,
    addedAt: typeof raw.addedAt === 'string' && raw.addedAt ? raw.addedAt : fallbackNowIso,
    isCurrent,
    isTrusted,
    status
  };
}

function fieldsToScope(fields: ShareFieldKey[]) {
  return fields.map((field) => {
    if (field === 'document_type') return 'document_type';
    return field;
  });
}

function shareStatus(expiresAt: string, revoked: boolean): ShareLink['status'] {
  if (revoked) return 'revoked';
  if (new Date(expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
}

function ensureShareLinksFromDocumentMeta(state: DemoState) {
  const nextById = new Map<string, ShareLink>();

  for (const link of state.accountSecurity.shareLinks) {
    nextById.set(link.id, {
      ...link,
      status:
        link.status === 'revoked'
          ? 'revoked'
          : new Date(link.expiresAt).getTime() <= Date.now()
            ? 'expired'
            : link.status ?? 'active'
    });
  }

  for (const [documentId, meta] of Object.entries(state.documentMeta)) {
    const docTitle = state.documents.find((item) => item.id === documentId)?.title;
    for (const share of meta.shares) {
      const current = nextById.get(share.id);
      nextById.set(share.id, {
        id: share.id,
        targetType: current?.targetType ?? 'document',
        targetId: documentId,
        targetTitle: current?.targetTitle ?? docTitle,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        scope: current?.scope ?? fieldsToScope(share.fields),
        status: shareStatus(share.expiresAt, share.revoked),
        link: share.link
      });
    }
  }

  state.accountSecurity.shareLinks = Array.from(nextById.values())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 120);
}

function ensureAccountSecurity(state: DemoState) {
  const nowIso = new Date().toISOString();
  const fallback: AccountSecurityState = {
    isLocked: false,
    lockType: 'soft',
    lockedAt: null,
    lockDuration: undefined,
    lockedUntil: undefined,
    lockReason: undefined,
    pinConfigured: true,
    compromisedDocuments: [],
    lockHistory: [],
    failedVerificationAttempts: [],
    deviceSessions: defaultDeviceSessions(nowIso),
    shareLinks: [],
    unlockPin: DEFAULT_SECURITY_PIN,
    lastLockAnimationAt: undefined
  };

  const current = state.accountSecurity;
  if (!current || typeof current !== 'object') {
    state.accountSecurity = fallback;
    return;
  }

  state.accountSecurity = {
    ...fallback,
    ...current,
    lockReason: typeof current.lockReason === 'string' ? current.lockReason : undefined,
    pinConfigured:
      typeof current.pinConfigured === 'boolean'
        ? current.pinConfigured
        : typeof current.unlockPin === 'string' && current.unlockPin.trim().length >= 4,
    compromisedDocuments: Array.isArray(current.compromisedDocuments) ? current.compromisedDocuments : [],
    lockHistory: Array.isArray(current.lockHistory) ? current.lockHistory : [],
    failedVerificationAttempts: Array.isArray(current.failedVerificationAttempts)
      ? current.failedVerificationAttempts
      : [],
    deviceSessions: Array.isArray(current.deviceSessions) && current.deviceSessions.length > 0
      ? current.deviceSessions.map((session, index) => normalizeSession(session, index, nowIso))
      : fallback.deviceSessions,
    shareLinks:
      Array.isArray(current.shareLinks) && current.shareLinks.length > 0
        ? current.shareLinks.map((link) => ({
            ...link,
            status:
              link.status === 'revoked'
                ? 'revoked'
                : new Date(link.expiresAt).getTime() <= Date.now()
                  ? 'expired'
                  : link.status ?? 'active'
          }))
        : []
  };

  ensureShareLinksFromDocumentMeta(state);
}

function normalizeState(candidate: Partial<DemoState> | null | undefined): DemoState {
  const base = createInitialDemoState();
  if (!candidate || typeof candidate !== 'object') return base;
  const normalized: DemoState = {
    ...base,
    ...candidate,
    documents: Array.isArray(candidate.documents) ? candidate.documents : base.documents,
    renewalInProgressDocumentIds: Array.isArray(candidate.renewalInProgressDocumentIds)
      ? candidate.renewalInProgressDocumentIds
      : base.renewalInProgressDocumentIds,
    requests: Array.isArray(candidate.requests) ? candidate.requests : base.requests,
    requestTimeline: Array.isArray(candidate.requestTimeline) ? candidate.requestTimeline : base.requestTimeline,
    messageThreads: Array.isArray(candidate.messageThreads) ? candidate.messageThreads : base.messageThreads,
    appointments: Array.isArray(candidate.appointments) ? candidate.appointments : base.appointments,
    notifications: Array.isArray(candidate.notifications) ? candidate.notifications : base.notifications,
    verificationEvents: Array.isArray(candidate.verificationEvents) ? candidate.verificationEvents : base.verificationEvents,
    accountSecurity:
      candidate.accountSecurity && typeof candidate.accountSecurity === 'object'
        ? ({ ...base.accountSecurity, ...candidate.accountSecurity } as DemoState['accountSecurity'])
        : base.accountSecurity,
    consents: Array.isArray(candidate.consents) ? candidate.consents : base.consents,
    documentMeta:
      candidate.documentMeta && typeof candidate.documentMeta === 'object' ? candidate.documentMeta : base.documentMeta,
    profile: candidate.profile ? { ...base.profile, ...candidate.profile } : base.profile
  };

  for (const document of normalized.documents) {
    ensureDocumentMetaForDocument(normalized, document);
  }
  ensureAccountSecurity(normalized);

  return normalized;
}

export function getDemoState(): DemoState {
  if (memoryState) return memoryState;

  if (!canUseStorage()) {
    memoryState = createInitialDemoState();
    return memoryState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createInitialDemoState();
      memoryState = seeded;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    memoryState = normalizeState(parsed);
    return memoryState;
  } catch {
    memoryState = createInitialDemoState();
    return memoryState;
  }
}

export function subscribeDemoState(listener: StoreListener) {
  listeners.add(listener);

  if (canUseStorage()) {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      memoryState = null;
      listener();
    };
    const onStoreEvent = () => listener();
    window.addEventListener('storage', onStorage);
    window.addEventListener(STORE_EVENT, onStoreEvent);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STORE_EVENT, onStoreEvent);
    };
  }

  return () => {
    listeners.delete(listener);
  };
}

export function updateDemoState(updater: (prev: DemoState) => DemoState) {
  const next = updater(cloneState(getDemoState()));
  persist(next);
}

export function resetDemoState() {
  persist(createInitialDemoState());
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createNotification(input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification {
  return {
    id: makeId('ntf'),
    createdAt: new Date().toISOString(),
    read: false,
    ...input
  };
}

function pushNotification(state: DemoState, notification: AppNotification) {
  state.notifications.unshift(notification);
  state.notifications = state.notifications.slice(0, 60);
}

function pushVerification(state: DemoState, item: VerificationEvent) {
  state.verificationEvents.unshift(item);
  state.verificationEvents = state.verificationEvents.slice(0, 80);
}

function pushHistory(state: DemoState, documentId: string, event: DocumentHistoryEvent) {
  const existing = state.documentMeta[documentId];
  if (!existing) return;
  existing.history.unshift(event);
  existing.history = existing.history.slice(0, 60);
  existing.lastUpdated = event.at;
}

function englishLockType(lockType: SecurityLockType) {
  return lockType === 'hard' ? 'Hard Lock' : 'Soft Lock';
}

function lockDurationToMs(duration: '1h' | '24h' | 'manual') {
  if (duration === '1h') return LOCK_DURATION_1H_MS;
  if (duration === '24h') return LOCK_DURATION_24H_MS;
  return null;
}

function shareDurationToMs(duration: ShareDuration) {
  if (duration === '10m') return 10 * 60 * 1000;
  if (duration === '1h') return LOCK_DURATION_1H_MS;
  return LOCK_DURATION_24H_MS;
}

function upsertShareLink(state: DemoState, shareLink: ShareLink) {
  ensureAccountSecurity(state);
  const existing = state.accountSecurity.shareLinks.findIndex((item) => item.id === shareLink.id);
  const normalized: ShareLink = {
    ...shareLink,
    status:
      shareLink.status === 'revoked'
        ? 'revoked'
        : new Date(shareLink.expiresAt).getTime() <= Date.now()
          ? 'expired'
          : shareLink.status ?? 'active'
  };
  if (existing >= 0) {
    state.accountSecurity.shareLinks[existing] = normalized;
  } else {
    state.accountSecurity.shareLinks.unshift(normalized);
  }
  state.accountSecurity.shareLinks = state.accountSecurity.shareLinks
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 120);
}

function markShareAsRevoked(state: DemoState, shareId: string) {
  ensureAccountSecurity(state);
  const shareLink = state.accountSecurity.shareLinks.find((item) => item.id === shareId);
  if (shareLink) {
    shareLink.status = 'revoked';
  }
}

function pushSecurityTimeline(
  state: DemoState,
  title: string,
  status: RequestStatus = 'in_review'
) {
  const requestId = state.requests[0]?.id ?? 'req_trp_1';
  state.requestTimeline.unshift({
    id: makeId('rtl'),
    requestId,
    status,
    title,
    at: new Date().toISOString()
  });
  state.requestTimeline = state.requestTimeline.slice(0, 120);
}

function pushLockHistory(state: DemoState, event: SecurityLockHistoryEvent) {
  ensureAccountSecurity(state);
  state.accountSecurity.lockHistory.unshift(event);
  state.accountSecurity.lockHistory = state.accountSecurity.lockHistory.slice(0, 80);
}

function pushFailedVerificationAttempt(state: DemoState, event: FailedVerificationAttempt) {
  ensureAccountSecurity(state);
  state.accountSecurity.failedVerificationAttempts.unshift(event);
  state.accountSecurity.failedVerificationAttempts = state.accountSecurity.failedVerificationAttempts.slice(0, 120);
}

export function isAccountLocked(state: DemoState = getDemoState()) {
  ensureAccountSecurity(state);
  return Boolean(state.accountSecurity.isLocked && state.accountSecurity.lockedAt);
}

export function getCompromisedDocumentIds(state: DemoState = getDemoState()) {
  ensureAccountSecurity(state);
  return new Set(state.accountSecurity.compromisedDocuments ?? []);
}

export function isDocumentCompromised(documentId: string, state: DemoState = getDemoState()) {
  return getCompromisedDocumentIds(state).has(documentId);
}

export function setLocale(locale: DemoState['locale']) {
  updateDemoState((state) => {
    state.locale = locale;
    state.profile.preferredLanguage = locale;
    return state;
  });
}

export function setDemoMode(enabled: boolean) {
  updateDemoState((state) => {
    if (enabled && !state.demoMode) {
      const seeded = createInitialDemoState();
      seeded.locale = state.locale;
      seeded.profile.preferredLanguage = state.locale;
      seeded.demoMode = true;
      return seeded;
    }
    state.demoMode = enabled;
    return state;
  });
}

export function activateEmergencyLock(input: {
  lockType: SecurityLockType;
  duration: '1h' | '24h' | 'manual';
  source?: string;
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const lockDuration = lockDurationToMs(input.duration);
  const lockedUntil = lockDuration ? new Date(now.getTime() + lockDuration).toISOString() : undefined;

  updateDemoState((state) => {
    ensureAccountSecurity(state);

    state.accountSecurity.isLocked = true;
    state.accountSecurity.lockType = input.lockType;
    state.accountSecurity.lockedAt = nowIso;
    state.accountSecurity.lockDuration = lockDuration ?? undefined;
    state.accountSecurity.lockedUntil = lockedUntil;
    state.accountSecurity.lockReason = input.source ?? 'Emergency lock';
    state.accountSecurity.lastLockAnimationAt = nowIso;

    if (input.lockType === 'hard') {
      state.accountSecurity.compromisedDocuments = state.documents.map((document) => document.id);
    }

    for (const meta of Object.values(state.documentMeta)) {
      for (const share of meta.shares) {
        if (share.revoked) continue;
        share.revoked = true;
        pushHistory(state, meta.documentId, {
          id: makeId('dh'),
          documentId: meta.documentId,
          type: 'share_revoked',
          at: nowIso,
          meta: share.link
        });
        markShareAsRevoked(state, share.id);
      }
    }

    for (const share of state.accountSecurity.shareLinks) {
      if (share.status !== 'active') continue;
      share.status = 'revoked';
    }

    pushLockHistory(state, {
      id: makeId('sec'),
      type: 'lock',
      lockType: input.lockType,
      at: nowIso,
      note: input.source ?? 'Emergency lock'
    });

    pushSecurityTimeline(
      state,
      input.lockType === 'hard' ? 'Emergency hard lock activated' : 'Emergency soft lock activated',
      'in_review'
    );

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'blocked',
      dataShown: `Emergency lock activated (${englishLockType(input.lockType)})`,
      at: nowIso,
      tokenStatus: 'blocked',
      lockState: 'locked',
      initiatedBy: 'user'
    });

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Account temporarily locked',
        body:
          input.lockType === 'hard'
            ? 'Hard lock active. Documents marked as compromised.'
            : 'Soft lock active. Verification is blocked until unlock.',
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );

    return state;
  });
}

export function unlockEmergencyLock(input: { pin: string; usedFaceId?: boolean; source?: 'manual' | 'auto' } = { pin: '' }) {
  const current = cloneState(getDemoState());
  ensureAccountSecurity(current);
  if (!current.accountSecurity.isLocked) {
    return { ok: false as const, reason: 'not_locked' as const };
  }

  const isAuto = input.source === 'auto';
  if (!isAuto && input.pin !== current.accountSecurity.unlockPin) {
    return { ok: false as const, reason: 'invalid_pin' as const };
  }

  const nowIso = new Date().toISOString();

  updateDemoState((state) => {
    ensureAccountSecurity(state);
    const previousLockType = state.accountSecurity.lockType;

    state.accountSecurity.isLocked = false;
    state.accountSecurity.lockedAt = null;
    state.accountSecurity.lockDuration = undefined;
    state.accountSecurity.lockedUntil = undefined;
    state.accountSecurity.lockReason = undefined;
    state.accountSecurity.lastLockAnimationAt = undefined;
    if (previousLockType === 'hard') {
      state.accountSecurity.compromisedDocuments = [];
    }

    pushLockHistory(state, {
      id: makeId('sec'),
      type: isAuto ? 'auto_unlock' : 'unlock',
      lockType: previousLockType,
      at: nowIso,
      note: isAuto ? 'Timed lock expired' : input.usedFaceId ? 'PIN + Face ID' : 'PIN verified'
    });

    pushSecurityTimeline(state, isAuto ? 'Emergency lock expired automatically' : 'Account unlocked by owner', 'in_review');

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: isAuto ? 'Emergency lock expired automatically' : 'Account successfully unlocked',
      at: nowIso,
      tokenStatus: 'valid',
      lockState: 'unlocked',
      initiatedBy: isAuto ? 'system' : 'user'
    });

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: isAuto ? 'Account auto-unlocked' : 'Account successfully unlocked',
        body: isAuto
          ? 'Timed lock expired and access was restored.'
          : 'Verification and sharing are available again.',
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );

    return state;
  });

  return { ok: true as const };
}

export function syncSecurityLockExpiry() {
  const state = cloneState(getDemoState());
  ensureAccountSecurity(state);
  if (!state.accountSecurity.isLocked || !state.accountSecurity.lockedAt || !state.accountSecurity.lockDuration) {
    return false;
  }

  const expiresAt = new Date(state.accountSecurity.lockedAt).getTime() + state.accountSecurity.lockDuration;
  if (Date.now() < expiresAt) {
    return false;
  }

  unlockEmergencyLock({ pin: state.accountSecurity.unlockPin, source: 'auto' });
  return true;
}

export function addFailedVerificationAttempt(input: { actor: string; reason: string }) {
  const nowIso = new Date().toISOString();
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    pushFailedVerificationAttempt(state, {
      id: makeId('fva'),
      actor: input.actor,
      reason: input.reason,
      at: nowIso
    });
    pushVerification(state, {
      id: makeId('ve'),
      verifier: input.actor,
      result: 'blocked',
      dataShown: input.reason,
      at: nowIso,
      tokenStatus: 'blocked',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'system'
    });
    return state;
  });
}

export function updateProfileFields(fields: Partial<DemoState['profile']>) {
  updateDemoState((state) => {
    state.profile = { ...state.profile, ...fields };
    return state;
  });
}

export function upsertDocument(document: CitizenDocument) {
  updateDemoState((state) => {
    const index = state.documents.findIndex((item) => item.id === document.id);
    if (index >= 0) {
      state.documents[index] = document;
    } else {
      state.documents.unshift(document);
    }
    ensureDocumentMetaForDocument(state, document);
    return state;
  });
}

export function setDocumentInRenewal(documentId: string, inProgress: boolean) {
  updateDemoState((state) => {
    const exists = state.renewalInProgressDocumentIds.includes(documentId);
    if (inProgress && !exists) {
      state.renewalInProgressDocumentIds.push(documentId);
    }
    if (!inProgress && exists) {
      state.renewalInProgressDocumentIds = state.renewalInProgressDocumentIds.filter((item) => item !== documentId);
    }
    return state;
  });
}

export function upsertRequest(request: ServiceRequest, timelineTitle = 'Request updated') {
  updateDemoState((state) => {
    const index = state.requests.findIndex((item) => item.id === request.id);
    if (index >= 0) {
      state.requests[index] = request;
    } else {
      state.requests.unshift(request);
    }

    state.requestTimeline.unshift({
      id: makeId('rtl'),
      requestId: request.id,
      status: request.status,
      title: timelineTitle,
      at: request.updatedAt
    });
    state.requestTimeline = state.requestTimeline.slice(0, 120);
    return state;
  });
}

export function createRequestFromWizard(input: {
  serviceSlug: string;
  attachedDocumentIds: string[];
  deliveryMethod: 'online' | 'in_person';
  feePaid: boolean;
}) {
  const service = SERVICE_DEFINITIONS.find((item) => item.slug === input.serviceSlug);
  if (!service) return null;

  const createdAt = new Date().toISOString();
  const request: ServiceRequest = {
    id: makeId('req'),
    reference: `REQ-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    serviceSlug: service.slug,
    serviceTitle: service.title,
    status: service.requiresAppointment && input.deliveryMethod === 'in_person' ? 'appointment_required' : 'submitted',
    submittedAt: createdAt,
    updatedAt: createdAt,
    deliveryMethod: input.deliveryMethod,
    attachedDocumentIds: input.attachedDocumentIds,
    feePaid: input.feePaid,
    paymentAmount: service.feeEur
  };

  updateDemoState((state) => {
    state.requests.unshift(request);
    state.requestTimeline.unshift({
      id: makeId('rtl'),
      requestId: request.id,
      status: request.status,
      title: `Request ${request.reference} submitted`,
      at: createdAt
    });

    pushNotification(
      state,
      createNotification({
        type: 'request',
        title: `Request submitted: ${request.reference}`,
        body: `${service.title} is now in processing.`,
        ctaLabel: 'View request',
        ctaHref: `/timeline/${request.id}`
      })
    );

    const messageThread: MessageThread = {
      id: makeId('thr'),
      authority: service.category === 'migration' ? 'Migration Department' : 'Cyprus Services',
      linkedRequestId: request.id,
      unreadCount: 1,
      lastMessageAt: createdAt,
      messages: [
        {
          id: makeId('msg'),
          threadId: '',
          from: 'authority',
          body: `Your request ${request.reference} has been received.`,
          at: createdAt
        }
      ]
    };
    messageThread.messages[0].threadId = messageThread.id;
    state.messageThreads.unshift(messageThread);

    if (service.requiresAppointment && input.deliveryMethod === 'in_person') {
      pushNotification(
        state,
        createNotification({
          type: 'appointment',
          title: 'Appointment required',
          body: 'Choose a time slot to continue processing your request.',
          ctaLabel: 'Book appointment',
          ctaHref: '/appointments'
        })
      );
    }

    state.requestTimeline = state.requestTimeline.slice(0, 120);
    state.notifications = state.notifications.slice(0, 60);
    state.messageThreads = state.messageThreads.slice(0, 20);
    return state;
  });

  return request;
}

export function setRequestStatus(requestId: string, status: RequestStatus, title?: string) {
  const now = new Date().toISOString();
  updateDemoState((state) => {
    const target = state.requests.find((item) => item.id === requestId);
    if (!target) return state;
    target.status = status;
    target.updatedAt = now;

    state.requestTimeline.unshift({
      id: makeId('rtl'),
      requestId,
      status,
      title: title ?? `Status changed to ${status.replace('_', ' ')}`,
      at: now
    });

    pushNotification(
      state,
      createNotification({
        type: 'request',
        title: `${target.reference} status updated`,
        body: `New status: ${status.replace('_', ' ')}`,
        ctaLabel: 'Track request',
        ctaHref: `/timeline/${requestId}`
      })
    );

    return state;
  });
}

export function withdrawRequest(requestId: string) {
  const now = new Date().toISOString();
  updateDemoState((state) => {
    const target = state.requests.find((item) => item.id === requestId);
    if (!target) return state;
    target.status = 'rejected';
    target.updatedAt = now;

    state.requestTimeline.unshift({
      id: makeId('rtl'),
      requestId,
      status: 'rejected',
      title: 'Request withdrawn by citizen',
      at: now
    });

    pushNotification(
      state,
      createNotification({
        type: 'request',
        title: `${target.reference} withdrawn`,
        body: 'The request was withdrawn and closed.',
        ctaLabel: 'View timeline',
        ctaHref: `/timeline/${requestId}`
      })
    );
    return state;
  });
}

export function addMessageToThread(input: {
  threadId: string;
  from: 'authority' | 'citizen' | 'system';
  body: string;
  attachments?: { documentId: string; title: string }[];
}) {
  const now = new Date().toISOString();
  updateDemoState((state) => {
    const thread = state.messageThreads.find((item) => item.id === input.threadId);
    if (!thread) return state;

    thread.messages.push({
      id: makeId('msg'),
      threadId: thread.id,
      from: input.from,
      body: input.body,
      at: now,
      attachments: input.attachments?.map((item) => ({ id: makeId('att'), ...item }))
    });
    thread.lastMessageAt = now;
    if (input.from === 'authority' || input.from === 'system') {
      thread.unreadCount += 1;
      pushNotification(
        state,
        createNotification({
          type: 'message',
          title: `New message from ${thread.authority}`,
          body: input.body.slice(0, 90),
          ctaLabel: 'Open message',
          ctaHref: `/inbox?thread=${thread.id}`
        })
      );
    }

    if (thread.linkedRequestId && input.from === 'citizen') {
      const request = state.requests.find((item) => item.id === thread.linkedRequestId);
      if (request) {
        request.status = 'in_review';
        request.updatedAt = now;
      }
      state.requestTimeline.unshift({
        id: makeId('rtl'),
        requestId: thread.linkedRequestId,
        status: 'in_review',
        title: 'Additional information submitted',
        at: now
      });
    }

    return state;
  });
}

export function markThreadRead(threadId: string) {
  updateDemoState((state) => {
    const thread = state.messageThreads.find((item) => item.id === threadId);
    if (thread) thread.unreadCount = 0;
    return state;
  });
}

export function addAppointment(input: Omit<Appointment, 'id' | 'status'>) {
  const created: Appointment = { id: makeId('apt'), status: 'upcoming', ...input };
  updateDemoState((state) => {
    state.appointments.unshift(created);
    pushNotification(
      state,
      createNotification({
        type: 'appointment',
        title: 'Appointment confirmed',
        body: `${created.title} on ${new Date(created.dateTime).toLocaleString()}`,
        ctaLabel: 'View appointments',
        ctaHref: '/appointments'
      })
    );

    if (created.requestId) {
      state.requestTimeline.unshift({
        id: makeId('rtl'),
        requestId: created.requestId,
        status: 'appointment_required',
        title: 'Appointment booked',
        at: new Date().toISOString()
      });
    }

    return state;
  });
  return created;
}

export function rescheduleAppointment(appointmentId: string, nextDateTime: string) {
  updateDemoState((state) => {
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment) return state;
    appointment.dateTime = nextDateTime;

    pushNotification(
      state,
      createNotification({
        type: 'appointment',
        title: 'Appointment rescheduled',
        body: `${appointment.title} moved to ${new Date(nextDateTime).toLocaleString()}`,
        ctaLabel: 'View appointments',
        ctaHref: '/appointments'
      })
    );
    return state;
  });
}

export function addVerificationEvent(input: Omit<VerificationEvent, 'id' | 'at'> & { at?: string }) {
  updateDemoState((state) => {
    pushVerification(state, {
      id: makeId('ve'),
      verifier: input.verifier,
      result: input.result,
      dataShown: input.dataShown,
      at: input.at ?? new Date().toISOString(),
      tokenStatus: input.tokenStatus,
      lockState: input.lockState,
      initiatedBy: input.initiatedBy
    });
    return state;
  });
}

export function markNotificationRead(notificationId: string) {
  updateDemoState((state) => {
    const target = state.notifications.find((item) => item.id === notificationId);
    if (target) target.read = true;
    return state;
  });
}

export function markAllNotificationsRead() {
  updateDemoState((state) => {
    for (const item of state.notifications) item.read = true;
    return state;
  });
}

export function setConsentConnected(consentId: string, connected: boolean) {
  updateDemoState((state) => {
    const consent = state.consents.find((item) => item.id === consentId);
    if (!consent) return state;
    consent.connected = connected;
    consent.lastSyncAt = new Date().toISOString();
    return state;
  });
}

export function setDocumentPrimaryTag(documentId: string, tag: DocumentTag) {
  updateDemoState((state) => {
    const meta = state.documentMeta[documentId];
    if (!meta) return state;
    meta.tag = tag;
    const document = state.documents.find((item) => item.id === documentId);
    if (document) {
      const remaining = document.tags.filter((item) => item !== tag);
      document.tags = [tag, ...remaining];
      document.lastUpdated = new Date().toISOString();
    }
    return state;
  });
}

export function addDocumentShare(input: {
  documentId: string;
  duration: ShareDuration;
  fields: ShareFieldKey[];
}) {
  const current = getDemoState();
  ensureAccountSecurity(current);
  if (current.accountSecurity.isLocked) {
    return null;
  }

  const now = new Date();
  const expires = new Date(
    now.getTime() +
      (input.duration === '10m' ? 10 * 60 * 1000 : input.duration === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
  );
  const link = `https://demo.civic.local/proof/${makeId('sh')}`;

  const record: DocumentShareRecord = {
    id: makeId('share'),
    documentId: input.documentId,
    link,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    revoked: false,
    fields: input.fields
  };

  updateDemoState((state) => {
    const document = state.documents.find((item) => item.id === input.documentId);
    if (document) ensureDocumentMetaForDocument(state, document);
    const meta = state.documentMeta[input.documentId];
    if (!meta) return state;
    meta.shares.unshift(record);
    meta.sharingPermissions = input.duration;
    pushHistory(state, input.documentId, {
      id: makeId('dh'),
      documentId: input.documentId,
      type: 'shared',
      at: record.createdAt,
      meta: `Fields: ${input.fields.join(', ')}`
    });

    upsertShareLink(state, {
      id: record.id,
      targetType: 'document',
      targetId: input.documentId,
      targetTitle: document?.title,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      scope: fieldsToScope(input.fields),
      status: 'active',
      link: record.link
    });

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Share link created for ${document?.title ?? 'document'}`,
      at: record.createdAt,
      tokenStatus: 'valid',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Document shared',
        body: `Secure proof link active until ${new Date(record.expiresAt).toLocaleTimeString()}`,
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );
    return state;
  });

  return record;
}

export function revokeDocumentShare(documentId: string, shareId: string) {
  updateDemoState((state) => {
    const meta = state.documentMeta[documentId];
    if (!meta) return state;
    const share = meta.shares.find((item) => item.id === shareId);
    if (!share) return state;
    if (share.revoked) return state;
    share.revoked = true;
    markShareAsRevoked(state, shareId);

    const document = state.documents.find((item) => item.id === documentId);
    const nowIso = new Date().toISOString();
    pushHistory(state, documentId, {
      id: makeId('dh'),
      documentId,
      type: 'share_revoked',
      at: nowIso,
      meta: share.link
    });

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Share link revoked for ${document?.title ?? 'document'}`,
      at: nowIso,
      tokenStatus: 'blocked',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Share link revoked',
        body: 'Selected proof link was revoked successfully.',
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );
    return state;
  });
}

export function addDocumentRenewalHistory(documentId: string, note: string) {
  updateDemoState((state) => {
    pushHistory(state, documentId, {
      id: makeId('dh'),
      documentId,
      type: 'renewal_attempt',
      at: new Date().toISOString(),
      meta: note
    });
    return state;
  });
}

export function createSecurityShareLink(input: {
  targetType: ShareLink['targetType'];
  targetId: string;
  targetTitle?: string;
  duration: ShareDuration;
  scope: string[];
  link?: string;
}) {
  const current = getDemoState();
  ensureAccountSecurity(current);
  if (current.accountSecurity.isLocked) return null;

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + shareDurationToMs(input.duration)).toISOString();
  const shareLink: ShareLink = {
    id: makeId('share'),
    targetType: input.targetType,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    createdAt,
    expiresAt,
    scope: input.scope,
    status: 'active',
    link: input.link ?? `${typeof window !== 'undefined' ? window.location.origin : 'https://demo.civic.local'}/verify?token=demo`
  };

  updateDemoState((state) => {
    ensureAccountSecurity(state);
    upsertShareLink(state, shareLink);

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Share link created (${input.targetType})`,
      at: createdAt,
      tokenStatus: 'valid',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Share link created',
        body: `${input.targetTitle ?? 'Proof'} can now be verified until ${new Date(expiresAt).toLocaleTimeString()}.`,
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );
    return state;
  });

  return shareLink;
}

export function revokeShareLinkById(shareId: string) {
  let changed = false;
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    const shareLink = state.accountSecurity.shareLinks.find((item) => item.id === shareId);
    if (!shareLink || shareLink.status === 'revoked') return state;

    shareLink.status = 'revoked';
    changed = true;

    if (shareLink.targetType === 'document') {
      const meta = state.documentMeta[shareLink.targetId];
      const docShare = meta?.shares.find((item) => item.id === shareId);
      if (docShare) {
        docShare.revoked = true;
        pushHistory(state, shareLink.targetId, {
          id: makeId('dh'),
          documentId: shareLink.targetId,
          type: 'share_revoked',
          at: new Date().toISOString(),
          meta: docShare.link
        });
      }
    }

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Share link revoked (${shareLink.targetTitle ?? shareLink.targetType})`,
      at: new Date().toISOString(),
      tokenStatus: 'blocked',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Share link revoked',
        body: 'Selected proof link was revoked successfully.',
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );

    pushSecurityTimeline(state, 'Share link revoked', 'in_review');

    return state;
  });
  return changed;
}

export function revokeAllActiveShareLinks() {
  let revokedCount = 0;
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    for (const share of state.accountSecurity.shareLinks) {
      if (share.status !== 'active') continue;
      share.status = 'revoked';
      revokedCount += 1;
      if (share.targetType === 'document') {
        const meta = state.documentMeta[share.targetId];
        const docShare = meta?.shares.find((item) => item.id === share.id);
        if (docShare && !docShare.revoked) {
          docShare.revoked = true;
          pushHistory(state, share.targetId, {
            id: makeId('dh'),
            documentId: share.targetId,
            type: 'share_revoked',
            at: new Date().toISOString(),
            meta: docShare.link
          });
        }
      }
    }

    if (revokedCount > 0) {
      pushVerification(state, {
        id: makeId('ve'),
        verifier: 'Citizen App',
        result: 'valid',
        dataShown: `Revoked ${revokedCount} active share links`,
        at: new Date().toISOString(),
        tokenStatus: 'blocked',
        lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
        initiatedBy: 'user'
      });

      pushNotification(
        state,
        createNotification({
          type: 'security',
          title: 'All active links revoked',
          body: `${revokedCount} proof links were revoked.`,
          ctaLabel: 'Open security',
          ctaHref: '/security'
        })
      );

      pushSecurityTimeline(state, 'All active proof links revoked', 'in_review');
    }
    return state;
  });
  return revokedCount;
}

export function extendShareLinkDuration(shareId: string, duration: ShareDuration) {
  let updated = false;
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    const share = state.accountSecurity.shareLinks.find((item) => item.id === shareId);
    if (!share || share.status !== 'active') return state;
    share.expiresAt = new Date(Date.now() + shareDurationToMs(duration)).toISOString();
    updated = true;

    if (share.targetType === 'document') {
      const docShare = state.documentMeta[share.targetId]?.shares.find((item) => item.id === shareId);
      if (docShare) {
        docShare.expiresAt = share.expiresAt;
      }
    }

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Share link extended (${share.targetTitle ?? share.targetType})`,
      at: new Date().toISOString(),
      tokenStatus: 'valid',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });
    return state;
  });
  return updated;
}

export function trustDeviceSession(sessionId: string) {
  let changed = false;
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    const session = state.accountSecurity.deviceSessions.find((item) => item.id === sessionId);
    if (!session) return state;
    session.isTrusted = true;
    if (session.status !== 'current') session.status = 'trusted';
    changed = true;

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Device trusted: ${session.deviceName}`,
      at: new Date().toISOString(),
      tokenStatus: 'valid',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });
    return state;
  });
  return changed;
}

export function removeTrustedDevice(sessionId: string) {
  let changed = false;
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    const session = state.accountSecurity.deviceSessions.find((item) => item.id === sessionId);
    if (!session) return state;
    session.isTrusted = false;
    if (!session.isCurrent && session.status !== 'suspicious') {
      session.status = 'new';
    }
    changed = true;

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Device trust removed: ${session.deviceName}`,
      at: new Date().toISOString(),
      tokenStatus: 'valid',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });
    return state;
  });
  return changed;
}

export function renameDeviceSession(sessionId: string, deviceName: string) {
  const trimmed = deviceName.trim();
  if (trimmed.length < 2) return false;
  let changed = false;
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    const session = state.accountSecurity.deviceSessions.find((item) => item.id === sessionId);
    if (!session) return state;
    session.deviceName = trimmed;
    changed = true;
    return state;
  });
  return changed;
}

export function signOutDeviceSession(sessionId: string) {
  let changed = false;
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    const session = state.accountSecurity.deviceSessions.find((item) => item.id === sessionId);
    if (!session || session.isCurrent) return state;
    session.isTrusted = false;
    session.status = session.status === 'suspicious' ? 'suspicious' : 'new';
    session.lastSeenAt = new Date().toISOString();
    changed = true;

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Session signed out',
        body: `${session.deviceName} was signed out.`,
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );
    pushSecurityTimeline(state, 'Session signed out', 'in_review');

    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Citizen App',
      result: 'valid',
      dataShown: `Session signed out: ${session.deviceName}`,
      at: new Date().toISOString(),
      tokenStatus: 'blocked',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'user'
    });
    return state;
  });
  return changed;
}

export function simulateSuspiciousLogin() {
  const nowIso = new Date().toISOString();
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    state.accountSecurity.deviceSessions.unshift({
      id: makeId('sess'),
      deviceName: 'Unknown Browser Session',
      deviceType: 'laptop',
      location: 'Cairo, Egypt',
      ipMasked: '41.33.*.*',
      lastSeenAt: nowIso,
      addedAt: nowIso,
      isCurrent: false,
      isTrusted: false,
      status: 'suspicious'
    });
    state.accountSecurity.deviceSessions = state.accountSecurity.deviceSessions.slice(0, 30);

    pushFailedVerificationAttempt(state, {
      id: makeId('fva'),
      actor: 'Unknown verifier',
      reason: 'Untrusted login detected',
      at: nowIso
    });

    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Suspicious sign-in detected',
        body: 'New login from Cairo, Egypt needs review.',
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );

    pushSecurityTimeline(state, 'Suspicious sign-in detected', 'in_review');
    return state;
  });
}

export function simulateUnauthorizedVerificationAttempt() {
  const nowIso = new Date().toISOString();
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    pushFailedVerificationAttempt(state, {
      id: makeId('fva'),
      actor: 'Unknown verifier',
      reason: 'Unauthorized verification attempt',
      at: nowIso
    });
    pushVerification(state, {
      id: makeId('ve'),
      verifier: 'Unknown verifier',
      result: 'blocked',
      dataShown: 'Unauthorized verification attempt',
      at: nowIso,
      tokenStatus: 'blocked',
      lockState: state.accountSecurity.isLocked ? 'locked' : 'unlocked',
      initiatedBy: 'system'
    });
    pushNotification(
      state,
      createNotification({
        type: 'security',
        title: 'Unauthorized verification blocked',
        body: 'Verification request was blocked automatically.',
        ctaLabel: 'Open security',
        ctaHref: '/security'
      })
    );
    pushSecurityTimeline(state, 'Unauthorized verification blocked', 'in_review');
    return state;
  });
}

export function simulateShareLinkLeak() {
  const state = getDemoState();
  const target = state.documents.find((item) => item.status === 'active') ?? state.documents[0];
  if (!target) return null;

  return createSecurityShareLink({
    targetType: 'document',
    targetId: target.id,
    targetTitle: target.title,
    duration: '24h',
    scope: ['status', 'validity'],
    link: `${typeof window !== 'undefined' ? window.location.origin : 'https://demo.civic.local'}/proof/leak/${makeId('lk')}`
  });
}

export function resetSecurityEvents() {
  updateDemoState((state) => {
    ensureAccountSecurity(state);
    state.accountSecurity.failedVerificationAttempts = [];
    state.accountSecurity.lockHistory = [];
    state.accountSecurity.isLocked = false;
    state.accountSecurity.lockedAt = null;
    state.accountSecurity.lockedUntil = undefined;
    state.accountSecurity.lockDuration = undefined;
    state.accountSecurity.lockReason = undefined;
    state.accountSecurity.lockType = 'soft';
    state.accountSecurity.compromisedDocuments = [];
    state.accountSecurity.lastLockAnimationAt = undefined;
    state.accountSecurity.deviceSessions = state.accountSecurity.deviceSessions.filter((session) => session.status !== 'suspicious');
    state.accountSecurity.shareLinks = state.accountSecurity.shareLinks.map((share) =>
      share.status === 'active' ? { ...share, status: 'revoked' } : share
    );
    for (const meta of Object.values(state.documentMeta)) {
      for (const share of meta.shares) {
        share.revoked = true;
      }
    }
    pushSecurityTimeline(state, 'Security signals reset', 'in_review');
    return state;
  });
}

export function getServiceDefinitionBySlug(slug: string) {
  return SERVICE_DEFINITIONS.find((item) => item.slug === slug) ?? null;
}
