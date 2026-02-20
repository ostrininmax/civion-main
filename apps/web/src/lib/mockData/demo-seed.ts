import type {
  AccountSecurityState,
  AppNotification,
  ConsentRecord,
  DemoState,
  DocumentMetaState,
  MessageThread,
  RequestTimelineItem,
  ServiceRequest,
  VerificationEvent
} from '../models/types';
import { MOCK_DOCUMENTS } from './documents';

const now = new Date('2026-02-19T09:00:00.000Z');

function offset(hours: number) {
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

const baseRequests: ServiceRequest[] = [
  {
    id: 'req_trp_1',
    reference: 'REQ-2026-000381',
    serviceSlug: 'temporary-residence-renewal',
    serviceTitle: 'Temporary Residence Permit Renewal',
    status: 'in_review',
    submittedAt: offset(-48),
    updatedAt: offset(-4),
    deliveryMethod: 'online',
    attachedDocumentIds: ['doc-residence', 'doc-passport', 'doc-address'],
    feePaid: true,
    paymentAmount: 70
  }
];

const baseTimeline: RequestTimelineItem[] = [
  {
    id: 'rtl_1',
    requestId: 'req_trp_1',
    status: 'submitted',
    title: 'Request submitted',
    at: offset(-48)
  },
  {
    id: 'rtl_2',
    requestId: 'req_trp_1',
    status: 'in_review',
    title: 'Request moved to review',
    at: offset(-4)
  }
];

const baseThreads: MessageThread[] = [
  {
    id: 'thr_migration',
    authority: 'Migration Department',
    linkedRequestId: 'req_trp_1',
    unreadCount: 1,
    lastMessageAt: offset(-3),
    messages: [
      {
        id: 'msg_m1',
        threadId: 'thr_migration',
        from: 'authority',
        body: 'Please attach updated address confirmation for request REQ-2026-000381.',
        at: offset(-3)
      }
    ]
  },
  {
    id: 'thr_tax',
    authority: 'Tax Department',
    unreadCount: 0,
    lastMessageAt: offset(-24),
    messages: [
      {
        id: 'msg_t1',
        threadId: 'thr_tax',
        from: 'authority',
        body: 'Tax clearance request was received and is being processed.',
        at: offset(-24)
      }
    ]
  },
  {
    id: 'thr_uni',
    authority: 'University',
    unreadCount: 0,
    lastMessageAt: offset(-18),
    messages: [
      {
        id: 'msg_u1',
        threadId: 'thr_uni',
        from: 'authority',
        body: 'Student status verification updated.',
        at: offset(-18)
      }
    ]
  },
  {
    id: 'thr_police',
    authority: 'Police verification system',
    unreadCount: 0,
    lastMessageAt: offset(-9),
    messages: [
      {
        id: 'msg_p1',
        threadId: 'thr_police',
        from: 'system',
        body: 'Latest identity verification was successful.',
        at: offset(-9)
      }
    ]
  }
];

const baseNotifications: AppNotification[] = [
  {
    id: 'ntf_trp_expiry',
    type: 'expiry',
    title: 'Residence Permit expires in 10 days',
    body: 'Renew now to avoid service interruption.',
    createdAt: offset(-2),
    read: false,
    ctaLabel: 'Renew now',
    ctaHref: '/wallet?filter=expiring'
  },
  {
    id: 'ntf_request_update',
    type: 'request',
    title: 'Request REQ-2026-000381 moved to review',
    body: 'Migration Department started processing your case.',
    createdAt: offset(-4),
    read: false,
    ctaLabel: 'View request',
    ctaHref: '/timeline/req_trp_1'
  },
  {
    id: 'ntf_message',
    type: 'message',
    title: 'New message from Migration Department',
    body: 'Additional address proof requested.',
    createdAt: offset(-3),
    read: false,
    ctaLabel: 'Open message',
    ctaHref: '/inbox?thread=thr_migration'
  },
  {
    id: 'ntf_security',
    type: 'security',
    title: 'Verification completed',
    body: 'Police verification system checked your proof successfully.',
    createdAt: offset(-9),
    read: true,
    ctaLabel: 'Open security',
    ctaHref: '/security'
  }
];

const baseVerificationEvents: VerificationEvent[] = [
  {
    id: 've_1',
    verifier: 'Police',
    result: 'valid',
    dataShown: 'Status + validity only',
    at: offset(-9)
  },
  {
    id: 've_2',
    verifier: 'Transport Gate',
    result: 'valid',
    dataShown: 'Status + validity only',
    at: offset(-11)
  },
  {
    id: 've_3',
    verifier: 'University Portal',
    result: 'valid',
    dataShown: 'Student eligibility + expiry date',
    at: offset(-18)
  }
];

const baseAccountSecurity: AccountSecurityState = {
  isLocked: false,
  lockType: 'soft',
  lockedAt: null,
  lockDuration: undefined,
  lockedUntil: undefined,
  compromisedDocuments: [],
  lockHistory: [],
  failedVerificationAttempts: [],
  deviceSessions: [
    {
      id: 'sess_web_primary',
      channel: 'web',
      location: 'Nicosia, Cyprus',
      device: 'Chrome on macOS',
      lastSeenAt: offset(-1),
      active: true
    },
    {
      id: 'sess_mobile',
      channel: 'mobile',
      location: 'Larnaca, Cyprus',
      device: 'Safari on iOS',
      lastSeenAt: offset(-8),
      active: true
    },
    {
      id: 'sess_tablet',
      channel: 'tablet',
      location: 'Limassol, Cyprus',
      device: 'iPadOS',
      lastSeenAt: offset(-72),
      active: false
    }
  ],
  unlockPin: '2580',
  lastLockAnimationAt: undefined
};

const baseConsents: ConsentRecord[] = [
  {
    id: 'consent_registry',
    name: 'Population Registry',
    connected: true,
    lastSyncAt: offset(-2),
    scope: 'Identity + residency status'
  },
  {
    id: 'consent_tax',
    name: 'Tax Registry',
    connected: true,
    lastSyncAt: offset(-5),
    scope: 'Tax profile status'
  },
  {
    id: 'consent_edu',
    name: 'Education Registry',
    connected: true,
    lastSyncAt: offset(-12),
    scope: 'Student status'
  }
];

const baseDocumentMeta: Record<string, DocumentMetaState> = Object.fromEntries(
  MOCK_DOCUMENTS.map((document, index) => {
    const createdAt = offset(-300 - index * 5);
    const verifiedAt = offset(-20 - index * 2);

    const meta: DocumentMetaState = {
      documentId: document.id,
      tag: document.tags[0],
      lastUpdated: document.lastUpdated,
      verifiedByRegistrySync: true,
      sharingPermissions: document.id === 'doc-residence' ? '10m' : '1h',
      shares: [],
      history: [
        {
          id: `dh_${document.id}_created`,
          documentId: document.id,
          type: 'created',
          at: createdAt,
          meta: 'Government registry seed'
        },
        {
          id: `dh_${document.id}_verified`,
          documentId: document.id,
          type: 'verified',
          at: verifiedAt,
          meta: 'Registry sync check'
        }
      ]
    };

    return [document.id, meta];
  })
);

export function createInitialDemoState(): DemoState {
  return {
    version: 5,
    locale: 'en',
    demoMode: true,
    documents: [...MOCK_DOCUMENTS],
    renewalInProgressDocumentIds: [],
    requests: [...baseRequests],
    requestTimeline: [...baseTimeline],
    messageThreads: [...baseThreads],
    appointments: [
      {
        id: 'apt_1',
        title: 'Migration Department appointment',
        office: 'Nicosia',
        dateTime: offset(36),
        status: 'upcoming',
        requestId: 'req_trp_1'
      },
      {
        id: 'apt_2',
        title: 'Tax office consultation',
        office: 'Limassol',
        dateTime: offset(-240),
        status: 'completed'
      }
    ],
    notifications: [...baseNotifications],
    verificationEvents: [...baseVerificationEvents],
    accountSecurity: {
      ...baseAccountSecurity,
      compromisedDocuments: [...(baseAccountSecurity.compromisedDocuments ?? [])],
      lockHistory: [...baseAccountSecurity.lockHistory],
      failedVerificationAttempts: [...baseAccountSecurity.failedVerificationAttempts],
      deviceSessions: baseAccountSecurity.deviceSessions.map((session) => ({ ...session }))
    },
    profile: {
      fullName: 'Roman Kochetov',
      dateOfBirth: '1997-04-12',
      address: 'Larnaca, Cyprus',
      phone: '+357 99 123 456',
      email: 'roman@civic.local',
      emergencyContact: 'Anna Kochetova (+357 99 777 222)',
      preferredLanguage: 'en'
    },
    consents: [...baseConsents],
    documentMeta: { ...baseDocumentMeta }
  };
}
