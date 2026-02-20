import { SERVICE_DEFINITIONS } from './mockData/definitions';
import { MOCK_DOCUMENTS } from './mockData/documents';
import { createBenefitPassToken, verifyBenefitPassToken } from './verification-token';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api';

type RequestInitExtra = RequestInit & {
  role?: 'resident' | 'advisor' | 'admin';
};

async function apiGet<T>(path: string, options?: RequestInitExtra): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: {
        ...(options?.role ? { 'x-role': options.role } : {})
      },
      cache: 'no-store'
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function apiPost<T>(path: string, body: unknown, options?: RequestInitExtra): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(options?.role ? { 'x-role': options.role } : {})
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function apiPatch<T>(path: string, body: unknown, options?: RequestInitExtra): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(options?.role ? { 'x-role': options.role } : {})
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type WalletDocument = {
  id: string;
  category: string;
  filename: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  metadata?: {
    documentNumber?: string;
    fullName?: string;
    dateOfBirth?: string;
    nationality?: string;
    scanConfidence?: number;
    source?: 'camera_ocr' | 'manual' | 'government_registry';
  };
  version: number;
  status: 'active' | 'deleted';
};

export type WalletShareLink = {
  shareId: string;
  documentId: string;
  url: string;
  expiresAt: string;
  role: 'advisor' | 'admin';
};

export type WalletShareAccess = {
  id: string;
  shareId: string;
  documentId: string;
  actor: string;
  action: 'created' | 'accessed';
  at: string;
};

export type CivicCardScope = 'student_discount' | 'trp_valid' | 'transport_concession';

export type CivicCardTokenResponse = {
  token: string;
  issuedAt: string;
  expiresAt: string;
  scopes: CivicCardScope[];
};

export type CivicCardVerificationResponse = {
  valid: boolean;
  reason?: 'missing_token' | 'invalid_format' | 'invalid_signature' | 'expired' | 'malformed_payload';
  issuedAt?: string;
  expiresAt?: string;
  issuer?: string;
  status?: 'eligible' | 'not_eligible';
  scopes?: CivicCardScope[];
  attributes?: {
    studentDiscount: boolean;
    temporaryResidencePermitValid: boolean;
    transportConcession: boolean;
  };
};

export type ProcessCatalogItem = {
  id: string;
  name: string;
  category: 'business' | 'immigration' | 'tax';
  eligibilitySummary: string;
  steps: string[];
  requiredDocuments: string[];
  estimatedDays: number;
};

const fallbackProcessCatalog: ProcessCatalogItem[] = SERVICE_DEFINITIONS.map((item) => ({
  id: item.slug,
  name: item.title,
  category: item.category === 'migration' ? 'immigration' : item.category === 'taxes' ? 'tax' : 'business',
  eligibilitySummary: item.eligibility,
  steps: item.steps,
  requiredDocuments: item.requirements,
  estimatedDays: item.expectedDays
}));

const fallbackTimeline: TimelineEvent[] = [
  {
    id: 'tl-trp',
    title: 'Residence Permit renewal due',
    dueDate: '2026-02-29T00:00:00.000Z',
    severity: 'important',
    source: 'document'
  },
  {
    id: 'tl-health',
    title: 'Health insurance update reminder',
    dueDate: '2026-03-10T00:00:00.000Z',
    severity: 'informational',
    source: 'manual'
  }
];

export type ProcessInstance = {
  id: string;
  processId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'completed';
  completedSteps: number[];
  currentStep: number;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

export type ProcessFlowStep = {
  index: number;
  title: string;
  completed: boolean;
  available: boolean;
};

export type ProcessFlowDocument = {
  category: string;
  present: boolean;
  filename?: string;
  documentId?: string;
};

export type ProcessFlow = {
  processId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'completed';
  instance: ProcessInstance | null;
  steps: ProcessFlowStep[];
  requiredDocuments: ProcessFlowDocument[];
  completedStepCount: number;
  totalStepCount: number;
  progressPercent: number;
  canSubmit: boolean;
  canComplete: boolean;
  blockers: string[];
};

export type TimelineCreateInput = {
  title: string;
  dueDate: string;
  severity: 'informational' | 'important' | 'critical';
  source?: 'document' | 'process' | 'manual';
};

export type TimelineEvent = {
  id: string;
  title: string;
  dueDate: string;
  severity: 'informational' | 'important' | 'critical';
  source: 'document' | 'process' | 'manual';
};

export type AiAnswer = {
  answer: string;
  nextRequiredAction: string;
  checklist: string[];
};

export type IntegrationOverview = {
  status: string;
  endpoints: Array<{ name: string; path: string }>;
};

export type IntegrationHealth = {
  services: Array<{ name: string; status: string }>;
};

export async function getWalletDocuments() {
  const apiResult = await apiGet<WalletDocument[]>('/wallet/documents');
  if (apiResult && apiResult.length > 0) return apiResult;
  return MOCK_DOCUMENTS.map((item) => ({
    id: item.id,
    category: item.category,
    filename: item.filename,
    issueDate: item.issueDate,
    expiryDate: item.expiryDate,
    issuingAuthority: item.issuer,
    metadata: {
      documentNumber: item.documentNumber,
      fullName: 'Roman Kochetov',
      source: 'government_registry' as const
    },
    version: 1,
    status: item.status
  }));
}

export async function uploadWalletDocument(payload: {
  category: string;
  filename: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  metadata?: {
    documentNumber?: string;
    fullName?: string;
    dateOfBirth?: string;
    nationality?: string;
    scanConfidence?: number;
    source?: 'camera_ocr' | 'manual' | 'government_registry';
  };
}) {
  return await apiPost<WalletDocument>('/wallet/documents', payload);
}

export async function createDocumentShareLink(documentId: string) {
  return await apiPost<WalletShareLink>(`/wallet/documents/${documentId}/share`, {
    ttlHours: 24,
    role: 'advisor'
  });
}

export async function getDocumentAccessLog(documentId: string) {
  return (await apiGet<WalletShareAccess[]>(`/wallet/documents/${documentId}/access-log`)) ?? [];
}

export async function generateCivicCardToken() {
  return (await apiPost<CivicCardTokenResponse>('/civic-card/token', {})) ?? createBenefitPassToken();
}

export async function verifyCivicCardToken(token: string) {
  return (
    (await apiGet<CivicCardVerificationResponse>(`/civic-card/verify?token=${encodeURIComponent(token)}`)) ??
    verifyBenefitPassToken(token)
  );
}

export async function getProcessCatalog() {
  return (await apiGet<ProcessCatalogItem[]>('/processes/catalog?country=cy')) ?? fallbackProcessCatalog;
}

export async function getProcessInstances() {
  return (await apiGet<ProcessInstance[]>('/processes/instances')) ?? [];
}

export async function getProcessInstanceByProcessId(processId: string) {
  return await apiGet<ProcessInstance | null>(`/processes/instances/by-process/${processId}`);
}

export async function getProcessFlow(processId: string) {
  return await apiGet<ProcessFlow>(`/processes/flow/${processId}`);
}

export async function startProcess(processId: string, options?: { forceNew?: boolean }) {
  return await apiPost<ProcessInstance>('/processes/instances', { processId, forceNew: Boolean(options?.forceNew) });
}

export async function updateProcessStatus(
  instanceId: string,
  status: 'not_started' | 'in_progress' | 'submitted' | 'completed'
) {
  return await apiPatch<ProcessInstance>(`/processes/instances/${instanceId}`, { status });
}

export async function completeProcessStep(instanceId: string, stepIndex: number) {
  return await apiPost<ProcessFlow>(`/processes/instances/${instanceId}/steps/${stepIndex}/complete`, {});
}

export async function submitProcess(instanceId: string) {
  return await apiPost<ProcessInstance>(`/processes/instances/${instanceId}/submit`, {});
}

export async function completeProcess(instanceId: string) {
  return await apiPost<ProcessInstance>(`/processes/instances/${instanceId}/complete`, {});
}

export async function getTimelineEvents() {
  return (await apiGet<TimelineEvent[]>('/timeline/events')) ?? fallbackTimeline;
}

export async function createTimelineReminder(payload: TimelineCreateInput) {
  return await apiPost<TimelineEvent>('/timeline/events', payload);
}

export async function askAssistant(question: string) {
  return await apiPost<AiAnswer>('/ai/ask', { question });
}

export async function getIntegrationOverview() {
  return await apiGet<IntegrationOverview>('/integrations/overview', { role: 'admin' });
}

export async function getIntegrationHealth() {
  return await apiGet<IntegrationHealth>('/integrations/health', { role: 'admin' });
}
