import type {
  AppNotification,
  Appointment,
  CitizenDocument,
  DemoState,
  DocumentTag,
  DocumentHistoryEvent,
  DocumentShareRecord,
  MessageThread,
  RequestStatus,
  ServiceRequest,
  ShareDuration,
  ShareFieldKey,
  VerificationEvent
} from '../models/types';
import { createInitialDemoState } from '../mockData/demo-seed';
import { SERVICE_DEFINITIONS } from '../mockData/definitions';

const STORAGE_KEY = 'cyprus-services.demo-state.v4';
const STORE_EVENT = 'cyprus-services:demo-state-updated';

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
    consents: Array.isArray(candidate.consents) ? candidate.consents : base.consents,
    documentMeta:
      candidate.documentMeta && typeof candidate.documentMeta === 'object' ? candidate.documentMeta : base.documentMeta,
    profile: candidate.profile ? { ...base.profile, ...candidate.profile } : base.profile
  };

  for (const document of normalized.documents) {
    ensureDocumentMetaForDocument(normalized, document);
  }

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
      at: input.at ?? new Date().toISOString()
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
    share.revoked = true;
    pushHistory(state, documentId, {
      id: makeId('dh'),
      documentId,
      type: 'share_revoked',
      at: new Date().toISOString(),
      meta: share.link
    });
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

export function getServiceDefinitionBySlug(slug: string) {
  return SERVICE_DEFINITIONS.find((item) => item.slug === slug) ?? null;
}
