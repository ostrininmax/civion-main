import type { AppNotification, DemoState, RequestStatus } from '../models/types';
import { t, ti } from '../i18n';
import {
  addVerificationEvent,
  getDemoState,
  setRequestStatus,
  updateDemoState
} from '../storage/demo-store';
import { appendRecentCheck } from '../recent-checks';
import { createBenefitPassToken, type BenefitPassTokenResponse } from '../verification-token';
import {
  pushDemoToast,
  setDemoHighlightedDocument,
  setDemoScenarioToken,
  setDemoTravelStatus
} from './runtime-store';
import type { DemoAction, DemoScenarioStep } from './scenarios';
import type { LocaleCode } from '../models/types';

type DemoRunHelpers = {
  locale: LocaleCode;
  navigate?: (path: string) => void;
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveRequestId(state: DemoState, requestId?: string) {
  if (requestId) return requestId;
  return state.requests[0]?.id ?? 'demo-request';
}

function resolvePath(path: string, token: BenefitPassTokenResponse | null) {
  if (!path.includes('{token}')) return path;
  const tokenValue = token?.token ?? '';
  return path.replaceAll('{token}', encodeURIComponent(tokenValue));
}

function englishText(key: string, params?: Record<string, string | number>, fallback?: string) {
  return params ? ti('en', key, params, fallback) : t('en', key, fallback);
}

function mutateDocumentValidity(sourceDocumentId: string | undefined, active: boolean) {
  const fallbackId = sourceDocumentId ?? 'doc-residence';
  const nextExpiry = active
    ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  updateDemoState((state) => {
    const document = state.documents.find((item) => item.id === fallbackId);
    if (!document) return state;
    document.expiryDate = nextExpiry;
    document.lastUpdated = new Date().toISOString();
    return state;
  });
}

function addNotification(action: Extract<DemoAction, { type: 'addNotification' }>) {
  updateDemoState((state) => {
    const title = englishText(action.titleKey);
    const body = englishText(action.bodyKey);
    const ctaLabel = action.ctaLabelKey ? englishText(action.ctaLabelKey) : undefined;

    const notification: AppNotification = {
      id: makeId('ntf'),
      type: action.notificationType,
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
      ctaHref: action.ctaHref,
      ctaLabel
    };

    state.notifications.unshift(notification);
    state.notifications = state.notifications.slice(0, 80);
    return state;
  });
}

function addTimelineEvent(action: Extract<DemoAction, { type: 'timelineEvent' }>) {
  updateDemoState((state) => {
    const requestId = resolveRequestId(state, action.requestId);
    const request = state.requests.find((item) => item.id === requestId) ?? null;

    state.requestTimeline.unshift({
      id: makeId('rtl'),
      requestId,
      status: action.status ?? request?.status ?? 'in_review',
      title: action.title,
      at: new Date().toISOString()
    });
    state.requestTimeline = state.requestTimeline.slice(0, 120);
    return state;
  });
}

function addAuditEvent(locale: LocaleCode, action: Extract<DemoAction, { type: 'addAuditEvent' }>) {
  const minimalData = englishText(action.minimalDataKey);
  addVerificationEvent({
    verifier: action.actor,
    result: action.result,
    dataShown: minimalData
  });

  appendRecentCheck({
    verifier: action.actor,
    result: action.result === 'valid' ? 'Valid' : 'Invalid',
    dataShown: minimalData,
    source: 'mock'
  });

  const toastLabel = action.result === 'valid' ? 'demo.toast.verification_valid' : 'demo.toast.verification_invalid';
  pushDemoToast(t(locale, toastLabel));
}

function applyRequestStatus(action: Extract<DemoAction, { type: 'setRequestStatus' }>) {
  const state = getDemoState();
  const requestId = resolveRequestId(state, action.requestId);
  const title = action.timelineTitle ?? englishText('timeline.status_changed', { status: action.status.replace('_', ' ') });
  setRequestStatus(requestId, action.status, title);
}

function generateToken(action: Extract<DemoAction, { type: 'generateVerificationToken' }>) {
  const token = createBenefitPassToken({
    scopes: action.scopes,
    ttlSeconds: action.expiresInSeconds,
    status: action.status,
    issuer: action.issuer,
    docType: action.docType
  });

  setDemoScenarioToken(token);
  return token;
}

export function runDemoAction(action: DemoAction, helpers: DemoRunHelpers): BenefitPassTokenResponse | null {
  const locale = helpers.locale;

  if (action.type === 'goTo') {
    const token = getDemoStateToken();
    helpers.navigate?.(resolvePath(action.path, token));
    return null;
  }

  if (action.type === 'openDocument') {
    setDemoHighlightedDocument(action.documentId);
    const base = `/wallet?filter=expiring&doc=${encodeURIComponent(action.documentId)}`;
    helpers.navigate?.(base);
    return null;
  }

  if (action.type === 'showToast') {
    pushDemoToast(ti(locale, action.messageKey, action.params));
    return null;
  }

  if (action.type === 'addNotification') {
    addNotification(action);
    return null;
  }

  if (action.type === 'addAuditEvent') {
    addAuditEvent(locale, action);
    return null;
  }

  if (action.type === 'setRequestStatus') {
    applyRequestStatus(action);
    return null;
  }

  if (action.type === 'generateVerificationToken') {
    return generateToken(action);
  }

  if (action.type === 'markRightActive') {
    mutateDocumentValidity(action.sourceDocumentId, true);
    return null;
  }

  if (action.type === 'markRightInactive') {
    mutateDocumentValidity(action.sourceDocumentId, false);
    return null;
  }

  if (action.type === 'timelineEvent') {
    addTimelineEvent(action);
    return null;
  }

  if (action.type === 'setTravelStatus') {
    setDemoTravelStatus(action.status);
    return null;
  }

  return null;
}

function getDemoStateToken() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem('cyprus-services.demo-runtime.v1') ?? '{}')?.lastGeneratedToken ?? null;
  } catch {
    return null;
  }
}

export function runDemoScenarioStep(step: DemoScenarioStep, helpers: DemoRunHelpers) {
  let generatedToken: BenefitPassTokenResponse | null = null;

  for (const action of step.actions ?? []) {
    const token = runDemoAction(action, helpers);
    if (token) {
      generatedToken = token;
    }
  }

  return generatedToken;
}

export function runDemoScenarioSteps(steps: DemoScenarioStep[], helpers: DemoRunHelpers) {
  let token: BenefitPassTokenResponse | null = null;
  for (const step of steps) {
    const nextToken = runDemoScenarioStep(step, helpers);
    if (nextToken) token = nextToken;
  }
  return token;
}

export function addTimelineVerificationEvent(status: RequestStatus = 'in_review') {
  addTimelineEvent({
    type: 'timelineEvent',
    status,
    title: 'Verification event logged'
  });
}
