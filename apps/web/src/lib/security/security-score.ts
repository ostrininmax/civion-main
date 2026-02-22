import type { DemoState, DeviceSession, SecurityState, ShareLink } from '../models/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type SecurityScoreBreakdownItem = {
  id: string;
  delta: number;
  applied: boolean;
  labelKey: string;
};

export type SecurityRecommendation = {
  id: string;
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  action:
    | 'review_links'
    | 'manage_devices'
    | 'configure_pin'
    | 'open_verifications'
    | 'activate_lock';
};

export type SecurityCenterSnapshot = {
  securityState: SecurityState;
  breakdown: SecurityScoreBreakdownItem[];
  recommendations: SecurityRecommendation[];
  shareLinks: ShareLink[];
  activeShareLinks: ShareLink[];
  trustedDevices: DeviceSession[];
  suspiciousSessions: DeviceSession[];
  recentBlockedAttempt: boolean;
  staleActiveShareCount: number;
};

function toMs(value: string | undefined | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeShareStatus(link: ShareLink): ShareLink {
  const expiresMs = toMs(link.expiresAt);
  if (link.status === 'revoked') return { ...link, status: 'revoked' };
  if (expiresMs > 0 && expiresMs <= Date.now()) {
    return { ...link, status: 'expired' };
  }
  return { ...link, status: 'active' };
}

function hasSuspiciousLockReason(reason: string | undefined) {
  if (!reason) return false;
  const normalized = reason.toLowerCase();
  return normalized.includes('suspicious') || normalized.includes('unauthorized');
}

export function computeSecuritySnapshot(state: DemoState): SecurityCenterSnapshot {
  const now = Date.now();
  const shareLinks = state.accountSecurity.shareLinks.map(normalizeShareStatus);
  const activeShareLinks = shareLinks.filter((link) => link.status === 'active');
  const staleActiveShareCount = activeShareLinks.filter((link) => now - toMs(link.createdAt) > DAY_MS).length;
  const trustedDevices = state.accountSecurity.deviceSessions.filter((session) => session.isTrusted);
  const suspiciousSessions = state.accountSecurity.deviceSessions.filter((session) => session.status === 'suspicious');
  const suspiciousRecent = suspiciousSessions.some((session) => now - toMs(session.lastSeenAt) <= WEEK_MS);
  const blockedByEvents = state.verificationEvents.some(
    (event) => event.result === 'blocked' && now - toMs(event.at) <= WEEK_MS
  );
  const blockedByFailedAttempts = state.accountSecurity.failedVerificationAttempts.some(
    (attempt) => now - toMs(attempt.at) <= WEEK_MS
  );
  const recentBlockedAttempt = blockedByEvents || blockedByFailedAttempts;
  const currentDeviceTrusted = state.accountSecurity.deviceSessions.some(
    (session) => session.isCurrent && session.isTrusted
  );
  const pinConfigured = Boolean(state.accountSecurity.pinConfigured);
  const tooManyActiveLinks = activeShareLinks.length > 3;
  const suspiciousLock = state.accountSecurity.isLocked && hasSuspiciousLockReason(state.accountSecurity.lockReason);
  const hasNoSuspiciousEvents = !suspiciousRecent && !recentBlockedAttempt;

  const breakdown: SecurityScoreBreakdownItem[] = [
    {
      id: 'locked_suspicious',
      delta: -20,
      applied: suspiciousLock,
      labelKey: 'security.score_rule_locked_suspicious'
    },
    {
      id: 'suspicious_login',
      delta: -15,
      applied: suspiciousRecent,
      labelKey: 'security.score_rule_suspicious_login'
    },
    {
      id: 'stale_links',
      delta: -10,
      applied: staleActiveShareCount > 0,
      labelKey: 'security.score_rule_stale_links'
    },
    {
      id: 'no_trusted_devices',
      delta: -10,
      applied: trustedDevices.length === 0,
      labelKey: 'security.score_rule_no_trusted_devices'
    },
    {
      id: 'no_pin',
      delta: -10,
      applied: !pinConfigured,
      labelKey: 'security.score_rule_no_pin'
    },
    {
      id: 'blocked_attempt',
      delta: -5,
      applied: recentBlockedAttempt,
      labelKey: 'security.score_rule_blocked_attempt'
    },
    {
      id: 'too_many_links',
      delta: -5,
      applied: tooManyActiveLinks,
      labelKey: 'security.score_rule_many_links'
    },
    {
      id: 'pin_configured',
      delta: 5,
      applied: pinConfigured,
      labelKey: 'security.score_rule_pin_configured'
    },
    {
      id: 'current_device_trusted',
      delta: 5,
      applied: currentDeviceTrusted,
      labelKey: 'security.score_rule_current_device_trusted'
    },
    {
      id: 'no_suspicious_events',
      delta: 5,
      applied: hasNoSuspiciousEvents,
      labelKey: 'security.score_rule_no_suspicious_events'
    }
  ];

  const scoreValue = breakdown.reduce((sum, item) => (item.applied ? sum + item.delta : sum), 100);
  const score = Math.max(0, Math.min(100, scoreValue));

  const status: SecurityState['status'] = state.accountSecurity.isLocked
    ? 'locked'
    : score >= 85
      ? 'protected'
      : score >= 60
        ? 'attention'
        : 'risk';

  const recommendations: SecurityRecommendation[] = [];
  if (suspiciousRecent) {
    recommendations.push({
      id: 'suspicious_login',
      titleKey: 'security.reco_suspicious_title',
      bodyKey: 'security.reco_suspicious_body',
      ctaKey: 'security.reco_manage_devices',
      action: 'manage_devices'
    });
  }
  if (activeShareLinks.length > 0) {
    recommendations.push({
      id: 'active_links',
      titleKey: 'security.reco_links_title',
      bodyKey: 'security.reco_links_body',
      ctaKey: 'security.reco_review_links',
      action: 'review_links'
    });
  }
  if (!pinConfigured) {
    recommendations.push({
      id: 'no_pin',
      titleKey: 'security.reco_pin_title',
      bodyKey: 'security.reco_pin_body',
      ctaKey: 'security.reco_configure_pin',
      action: 'configure_pin'
    });
  }
  if (recentBlockedAttempt) {
    recommendations.push({
      id: 'blocked_attempt',
      titleKey: 'security.reco_blocked_title',
      bodyKey: 'security.reco_blocked_body',
      ctaKey: 'security.reco_open_verifications',
      action: 'open_verifications'
    });
  }
  if (!state.accountSecurity.isLocked && status !== 'protected') {
    recommendations.push({
      id: 'activate_lock',
      titleKey: 'security.reco_lock_title',
      bodyKey: 'security.reco_lock_body',
      ctaKey: 'security.reco_activate_lock',
      action: 'activate_lock'
    });
  }

  const securityState: SecurityState = {
    score,
    status,
    emergencyLock: {
      isLocked: state.accountSecurity.isLocked,
      lockType: state.accountSecurity.lockType,
      lockedAt: state.accountSecurity.lockedAt ?? undefined,
      expiresAt: state.accountSecurity.lockedUntil ?? null,
      reason: state.accountSecurity.lockReason,
      pinConfigured
    }
  };

  return {
    securityState,
    breakdown,
    recommendations: recommendations.slice(0, 4),
    shareLinks,
    activeShareLinks,
    trustedDevices,
    suspiciousSessions,
    recentBlockedAttempt,
    staleActiveShareCount
  };
}
