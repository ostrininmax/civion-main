export type LocaleCode = 'en' | 'el' | 'ru' | 'uk' | 'hi' | 'ar';

export type ServiceCategory = 'identity' | 'migration' | 'education' | 'taxes' | 'business' | 'healthcare';

export type ServiceMode = 'online' | 'in_person' | 'hybrid';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'appointment_required'
  | 'completed';

export type NotificationType = 'expiry' | 'request' | 'message' | 'appointment' | 'security';

export type DocumentTag = 'identity' | 'migration' | 'finance' | 'health' | 'business';
export type DocumentLifecycle = 'active' | 'expiring_soon' | 'expired' | 'in_renewal' | 'compromised';

export type ShareDuration = '10m' | '1h' | '24h';

export type ShareFieldKey = 'status' | 'validity' | 'issuer' | 'document_type';

export type VerificationResult = 'valid' | 'invalid';

export type CitizenDocument = {
  id: string;
  category: string;
  title: string;
  filename: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  status: 'active' | 'deleted';
  tags: DocumentTag[];
  lastUpdated: string;
};

export type ServiceDefinition = {
  slug: string;
  title: string;
  category: ServiceCategory;
  mode: ServiceMode;
  outcome: string;
  eligibility: string;
  requirements: string[];
  steps: string[];
  expectedDays: number;
  requiresAppointment: boolean;
  requiresPayment: boolean;
  feeEur: number;
  mostUsed?: boolean;
  recommended?: boolean;
};

export type ServiceRequest = {
  id: string;
  reference: string;
  serviceSlug: string;
  serviceTitle: string;
  status: RequestStatus;
  submittedAt: string;
  updatedAt: string;
  deliveryMethod: 'online' | 'in_person';
  attachedDocumentIds: string[];
  feePaid: boolean;
  paymentAmount: number;
  appointmentId?: string;
  notes?: string;
};

export type RequestTimelineItem = {
  id: string;
  requestId: string;
  status: RequestStatus;
  title: string;
  at: string;
};

export type MessageAttachment = {
  id: string;
  documentId: string;
  title: string;
};

export type ThreadMessage = {
  id: string;
  threadId: string;
  from: 'authority' | 'citizen' | 'system';
  body: string;
  at: string;
  attachments?: MessageAttachment[];
};

export type MessageThread = {
  id: string;
  authority: string;
  linkedRequestId?: string;
  unreadCount: number;
  lastMessageAt: string;
  messages: ThreadMessage[];
};

export type Appointment = {
  id: string;
  title: string;
  office: 'Nicosia' | 'Limassol' | 'Larnaca' | 'Paphos';
  dateTime: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  requestId?: string;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  ctaLabel?: string;
  ctaHref?: string;
};

export type VerificationEvent = {
  id: string;
  verifier: string;
  result: VerificationResult;
  dataShown: string;
  at: string;
};

export type SecurityLockType = 'soft' | 'hard';

export type SecurityLockHistoryEvent = {
  id: string;
  type: 'lock' | 'unlock' | 'auto_unlock';
  lockType?: SecurityLockType;
  at: string;
  note?: string;
};

export type FailedVerificationAttempt = {
  id: string;
  actor: string;
  at: string;
  reason: string;
};

export type DeviceSession = {
  id: string;
  channel: 'web' | 'mobile' | 'tablet';
  location: string;
  device: string;
  lastSeenAt: string;
  active: boolean;
};

export type AccountSecurityState = {
  isLocked: boolean;
  lockType: SecurityLockType;
  lockedAt: string | null;
  lockDuration?: number;
  lockedUntil?: string;
  compromisedDocuments?: string[];
  lockHistory: SecurityLockHistoryEvent[];
  failedVerificationAttempts: FailedVerificationAttempt[];
  deviceSessions: DeviceSession[];
  unlockPin: string;
  lastLockAnimationAt?: string;
};

export type UserProfile = {
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  emergencyContact: string;
  preferredLanguage: LocaleCode;
};

export type ConsentRecord = {
  id: string;
  name: string;
  connected: boolean;
  lastSyncAt: string;
  scope: string;
};

export type DocumentShareRecord = {
  id: string;
  documentId: string;
  link: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  fields: ShareFieldKey[];
};

export type DocumentHistoryEvent = {
  id: string;
  documentId: string;
  type: 'created' | 'shared' | 'verified' | 'renewal_attempt' | 'share_revoked';
  at: string;
  meta?: string;
};

export type DocumentMetaState = {
  documentId: string;
  tag: DocumentTag;
  lastUpdated: string;
  verifiedByRegistrySync: boolean;
  sharingPermissions: ShareDuration;
  shares: DocumentShareRecord[];
  history: DocumentHistoryEvent[];
};

export type DemoState = {
  version: number;
  locale: LocaleCode;
  demoMode: boolean;
  documents: CitizenDocument[];
  renewalInProgressDocumentIds: string[];
  requests: ServiceRequest[];
  requestTimeline: RequestTimelineItem[];
  messageThreads: MessageThread[];
  appointments: Appointment[];
  notifications: AppNotification[];
  verificationEvents: VerificationEvent[];
  accountSecurity: AccountSecurityState;
  profile: UserProfile;
  consents: ConsentRecord[];
  documentMeta: Record<string, DocumentMetaState>;
};
