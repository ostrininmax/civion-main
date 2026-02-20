export type RecentCheckResult = 'Valid' | 'Invalid';

export type RecentCheck = {
  id: string;
  verifier: string;
  result: RecentCheckResult;
  dataShown: string;
  timestamp: string;
  source: 'mock' | 'share_proof' | 'qr_generated' | 'renewal' | 'update_request' | 'access_log';
};

export const RECENT_CHECKS_EVENT = 'cyprus-services:recent-checks-updated';

const STORAGE_KEY = 'cyprus-services.recent-checks';

export const BASE_RECENT_CHECKS: RecentCheck[] = [
  {
    id: 'mock-police-check',
    verifier: 'Police',
    result: 'Valid',
    dataShown: 'Status + validity only',
    timestamp: '2026-02-18T10:21:00.000Z',
    source: 'mock'
  },
  {
    id: 'mock-transport-gate',
    verifier: 'Transport Gate',
    result: 'Valid',
    dataShown: 'Status + validity only',
    timestamp: '2026-02-18T09:14:00.000Z',
    source: 'mock'
  },
  {
    id: 'mock-university-portal',
    verifier: 'University Portal',
    result: 'Valid',
    dataShown: 'Student eligibility + expiry date',
    timestamp: '2026-02-17T15:38:00.000Z',
    source: 'mock'
  },
  {
    id: 'mock-tax-department',
    verifier: 'Tax Department',
    result: 'Valid',
    dataShown: 'Identity status + tax id validity',
    timestamp: '2026-02-16T12:07:00.000Z',
    source: 'mock'
  },
  {
    id: 'mock-migration-desk',
    verifier: 'Migration Department',
    result: 'Invalid',
    dataShown: 'Status + validity only',
    timestamp: '2026-02-15T08:43:00.000Z',
    source: 'mock'
  }
];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readRecentChecks() {
  if (!canUseStorage()) return [] as RecentCheck[];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as RecentCheck[];
    const parsed = JSON.parse(raw) as RecentCheck[];
    if (!Array.isArray(parsed)) return [] as RecentCheck[];
    return parsed;
  } catch {
    return [] as RecentCheck[];
  }
}

export function appendRecentCheck(input: Omit<RecentCheck, 'id' | 'timestamp'> & { timestamp?: string }) {
  if (!canUseStorage()) return;

  const nextRecord: RecentCheck = {
    id: `chk_${Math.random().toString(36).slice(2, 10)}`,
    verifier: input.verifier,
    result: input.result,
    dataShown: input.dataShown,
    timestamp: input.timestamp ?? new Date().toISOString(),
    source: input.source
  };

  const current = readRecentChecks();
  const next = [nextRecord, ...current].slice(0, 40);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(RECENT_CHECKS_EVENT));
  } catch {
    // Ignore localStorage failures in demo mode.
  }
}

export function mergeRecentChecks(...groups: RecentCheck[][]) {
  return groups
    .flat()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
