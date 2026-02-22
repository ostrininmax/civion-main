'use client';

import { createInitialDemoState } from '../mockData/demo-seed';
import { updateDemoState } from '../storage/demo-store';

export const ONBOARDING_COMPLETED_KEY = 'benefitpass_onboarding_completed';
export const ONBOARDING_PROGRESS_KEY = 'benefitpass_onboarding_progress';
export const ONBOARDING_EVENTS_KEY = 'benefitpass_onboarding_events';
export const ONBOARDING_COMMAND_EVENT = 'benefitpass:onboarding-command';
export const ONBOARDING_STATE_EVENT = 'benefitpass:onboarding-state-changed';

export type TourPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left';
export type OnboardingTourVariant = 'premium' | 'standard';
export const DEFAULT_ONBOARDING_VARIANT: OnboardingTourVariant = 'premium';

export type OnboardingCommandMode = 'start' | 'resume' | 'restart';

export type OnboardingLogEventType = 'tour_started' | 'tour_step_completed' | 'tour_skipped' | 'tour_finished';

export type OnboardingLogEvent = {
  id: string;
  type: OnboardingLogEventType;
  at: string;
  stepId?: string;
  stepIndex?: number;
  source?: 'auto' | 'manual' | 'resume';
  variant?: OnboardingTourVariant;
};

export type OnboardingCommandDetail = {
  mode: OnboardingCommandMode;
  variant?: OnboardingTourVariant;
};

export type OnboardingActionContext = {
  ensureDemoData: () => void;
  openNotificationsMenu: () => void;
  closeNotificationsMenu: () => void;
};

export type OnboardingStep = {
  id: string;
  route: string;
  target?: string;
  titleKey: string;
  bodyKey: string;
  secondaryKey?: string;
  placement?: TourPlacement;
  waitForSelector?: string;
  canSkip?: boolean;
  pacingMs?: number;
  actionBefore?: (ctx: OnboardingActionContext) => Promise<void> | void;
  actionAfter?: (ctx: OnboardingActionContext) => Promise<void> | void;
};

export type OnboardingProgressPayload = {
  stepIndex: number;
  variant: OnboardingTourVariant;
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function isOnboardingTourVariant(value: unknown): value is OnboardingTourVariant {
  return value === 'premium' || value === 'standard';
}

function dispatchStateChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_STATE_EVENT));
}

export function readOnboardingCompleted() {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
}

export function setOnboardingCompleted(value: boolean) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, value ? 'true' : 'false');
  dispatchStateChanged();
}

export function readOnboardingProgress() {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(ONBOARDING_PROGRESS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProgressPayload>;
    if (typeof parsed?.stepIndex === 'number' && parsed.stepIndex >= 0) {
      return {
        stepIndex: parsed.stepIndex,
        variant: isOnboardingTourVariant(parsed.variant) ? parsed.variant : DEFAULT_ONBOARDING_VARIANT
      } satisfies OnboardingProgressPayload;
    }
  } catch {
    // Legacy fallback below.
  }

  const legacyParsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(legacyParsed) || legacyParsed < 0) return null;
  return {
    stepIndex: legacyParsed,
    variant: DEFAULT_ONBOARDING_VARIANT
  } satisfies OnboardingProgressPayload;
}

export function saveOnboardingProgress(stepIndex: number, variant: OnboardingTourVariant = DEFAULT_ONBOARDING_VARIANT) {
  if (!canUseStorage()) return;
  const payload: OnboardingProgressPayload = {
    stepIndex: Math.max(0, stepIndex),
    variant
  };
  window.localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(payload));
  dispatchStateChanged();
}

export function clearOnboardingProgress() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  dispatchStateChanged();
}

export function readOnboardingEvents() {
  if (!canUseStorage()) return [] as OnboardingLogEvent[];
  try {
    const raw = window.localStorage.getItem(ONBOARDING_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OnboardingLogEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readOnboardingMeta() {
  const completed = readOnboardingCompleted();
  const progress = readOnboardingProgress();
  return {
    completed,
    progressIndex: progress?.stepIndex ?? null,
    progressVariant: progress?.variant ?? null,
    canResume: progress !== null
  };
}

export function logOnboardingEvent(event: Omit<OnboardingLogEvent, 'id' | 'at'>) {
  if (!canUseStorage()) return;

  const nextItem: OnboardingLogEvent = {
    id: makeId('onboard'),
    at: new Date().toISOString(),
    ...event
  };

  try {
    const raw = window.localStorage.getItem(ONBOARDING_EVENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as OnboardingLogEvent[]) : [];
    const safe = Array.isArray(parsed) ? parsed : [];
    safe.unshift(nextItem);
    window.localStorage.setItem(ONBOARDING_EVENTS_KEY, JSON.stringify(safe.slice(0, 200)));
  } catch {
    // Ignore local telemetry write failures.
  }
}

export function dispatchOnboardingCommand(mode: OnboardingCommandMode, variant?: OnboardingTourVariant) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<OnboardingCommandDetail>(ONBOARDING_COMMAND_EVENT, { detail: { mode, variant } }));
}

export function shouldSuppressAutoOnboarding(pathname: string) {
  return (
    pathname.startsWith('/presenter') ||
    pathname.startsWith('/authority-check') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/qa')
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function ensureOnboardingData() {
  const seeded = createInitialDemoState();
  const now = Date.now();

  updateDemoState((state) => {
    if (state.documents.length === 0) {
      state.documents = seeded.documents.slice(0, 4).map((item) => clone(item));
    }

    const hasResidence = state.documents.some((item) => item.id === 'doc-residence');
    if (!hasResidence) {
      const residence = seeded.documents.find((item) => item.id === 'doc-residence') ?? seeded.documents[0];
      if (residence) {
        state.documents.unshift(clone(residence));
      }
    }

    const seededResidence = seeded.documents.find((item) => item.id === 'doc-residence');
    const residence = state.documents.find((item) => item.id === 'doc-residence');
    if (residence && seededResidence?.expiryDate) {
      const currentExpiry = residence.expiryDate ? new Date(residence.expiryDate).getTime() : Number.NaN;
      const fortyFiveDaysMs = 45 * 24 * 60 * 60 * 1000;
      if (!Number.isFinite(currentExpiry) || currentExpiry - now > fortyFiveDaysMs) {
        residence.expiryDate = seededResidence.expiryDate;
      }
    }

    for (const doc of state.documents) {
      if (!state.documentMeta[doc.id] && seeded.documentMeta[doc.id]) {
        state.documentMeta[doc.id] = clone(seeded.documentMeta[doc.id]);
      }
    }

    if (state.requests.length === 0 && seeded.requests[0]) {
      state.requests = [clone(seeded.requests[0])];
    }

    if (state.requestTimeline.length === 0) {
      state.requestTimeline = seeded.requestTimeline.slice(0, 2).map((item) => clone(item));
    }

    if (state.notifications.length === 0) {
      state.notifications = seeded.notifications.slice(0, 3).map((item) => clone(item));
    }

    if (state.messageThreads.length === 0) {
      state.messageThreads = seeded.messageThreads.slice(0, 2).map((item) => clone(item));
    }

    if (state.verificationEvents.length === 0) {
      state.verificationEvents = seeded.verificationEvents.slice(0, 2).map((item) => clone(item));
    }

    if (state.accountSecurity.deviceSessions.length === 0) {
      state.accountSecurity.deviceSessions = seeded.accountSecurity.deviceSessions.map((item) => clone(item));
    }

    if (state.accountSecurity.shareLinks.length === 0) {
      state.accountSecurity.shareLinks = seeded.accountSecurity.shareLinks.map((item) => clone(item));
    }

    if (state.accountSecurity.lockHistory.length === 0 && seeded.accountSecurity.lockHistory.length > 0) {
      state.accountSecurity.lockHistory = seeded.accountSecurity.lockHistory.slice(0, 2).map((item) => clone(item));
    }

    return state;
  });
}

function parseRoute(value: string) {
  const [pathname, query = ''] = value.split('?');
  return {
    pathname,
    query: new URLSearchParams(query)
  };
}

export function routeMatches(expectedRoute: string, pathname: string, search: string) {
  const expected = parseRoute(expectedRoute);
  if (pathname !== expected.pathname) return false;

  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of expected.query.entries()) {
    if (current.get(key) !== value) return false;
  }

  return true;
}

export async function waitForRoute(expectedRoute: string, timeoutMs = 7000): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (routeMatches(expectedRoute, window.location.pathname, window.location.search)) {
      return true;
    }
    await sleep(70);
  }

  return false;
}

export function waitForSelector(selector: string, timeoutMs = 5000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const start = Date.now();

    const tick = () => {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }

      window.requestAnimationFrame(tick);
    };

    tick();
  });
}

export function smoothScrollToElement(element: HTMLElement) {
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 900;
  element.scrollIntoView({
    behavior: isMobileViewport ? 'auto' : 'smooth',
    block: 'center',
    inline: 'center'
  });
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function getElementRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom
  };
}

export function createOnboardingActionContext(): OnboardingActionContext {
  return {
    ensureDemoData: ensureOnboardingData,
    openNotificationsMenu() {
      const bell = document.querySelector('[data-tour="notifications-bell"]') as HTMLButtonElement | null;
      if (bell?.getAttribute('aria-expanded') !== 'true') {
        bell?.click();
      }
    },
    closeNotificationsMenu() {
      const bell = document.querySelector('[data-tour="notifications-bell"]') as HTMLButtonElement | null;
      if (bell?.getAttribute('aria-expanded') === 'true') {
        bell?.click();
      }
    }
  };
}
