import { createBenefitPassToken, verifyBenefitPassToken } from './verification-token';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET'
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function apiPatch<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
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

export async function generateCivicCardToken() {
  return (await apiPost<CivicCardTokenResponse>('/civic-card/token', {})) ?? createBenefitPassToken();
}

export async function verifyCivicCardToken(token: string) {
  return (
    (await apiGet<CivicCardVerificationResponse>(`/civic-card/verify?token=${encodeURIComponent(token)}`)) ??
    verifyBenefitPassToken(token)
  );
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
  return await apiPost(`/processes/instances/${instanceId}/steps/${stepIndex}/complete`, {});
}

export async function submitProcess(instanceId: string) {
  return await apiPost<ProcessInstance>(`/processes/instances/${instanceId}/submit`, {});
}

export async function completeProcess(instanceId: string) {
  return await apiPost<ProcessInstance>(`/processes/instances/${instanceId}/complete`, {});
}

export async function createTimelineReminder(payload: {
  title: string;
  dueDate: string;
  severity: 'informational' | 'important' | 'critical';
  source?: 'document' | 'process' | 'manual';
}) {
  return await apiPost('/timeline/events', payload);
}
