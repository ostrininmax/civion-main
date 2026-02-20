import type { BenefitPassTokenResponse } from '../verification-token';

export type DemoTravelStatus = 'idle' | 'in_progress' | 'cleared' | 'needs_proof';

export type DemoToast = {
  id: string;
  message: string;
  createdAt: string;
};

export type QaClickLog = {
  id: string;
  timestamp: string;
  path: string;
  label: string;
  action: string;
};

export type DemoRuntimeState = {
  version: number;
  tour: {
    active: boolean;
    scenarioId: string | null;
    stepIndex: number;
  };
  presenter: {
    active: boolean;
    stepIndex: number;
  };
  activeScenarioId: string | null;
  highlightedDocumentId: string | null;
  lastGeneratedToken: BenefitPassTokenResponse | null;
  travelStatus: DemoTravelStatus;
  toasts: DemoToast[];
  qa: {
    enabled: boolean;
    clickLogs: QaClickLog[];
    lastFeedbackAt: number;
  };
};

const STORAGE_KEY = 'cyprus-services.demo-runtime.v2';
const STORE_EVENT = 'cyprus-services:demo-runtime-updated';

const listeners = new Set<() => void>();

let memoryState: DemoRuntimeState | null = null;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function cloneState(state: DemoRuntimeState): DemoRuntimeState {
  return JSON.parse(JSON.stringify(state)) as DemoRuntimeState;
}

function createInitialDemoRuntimeState(): DemoRuntimeState {
  return {
    version: 2,
    tour: {
      active: false,
      scenarioId: null,
      stepIndex: 0
    },
    presenter: {
      active: false,
      stepIndex: 0
    },
    activeScenarioId: null,
    highlightedDocumentId: null,
    lastGeneratedToken: null,
    travelStatus: 'idle',
    toasts: [],
    qa: {
      enabled: false,
      clickLogs: [],
      lastFeedbackAt: 0
    }
  };
}

function normalize(candidate: Partial<DemoRuntimeState> | null | undefined): DemoRuntimeState {
  const base = createInitialDemoRuntimeState();
  if (!candidate || typeof candidate !== 'object') return base;

  return {
    ...base,
    ...candidate,
    tour: {
      ...base.tour,
      ...(candidate.tour ?? {})
    },
    presenter: {
      ...base.presenter,
      ...(candidate.presenter ?? {})
    },
    toasts: Array.isArray(candidate.toasts) ? candidate.toasts : base.toasts,
    qa: {
      ...base.qa,
      ...(candidate.qa ?? {}),
      clickLogs: Array.isArray(candidate.qa?.clickLogs) ? candidate.qa.clickLogs : base.qa.clickLogs,
      lastFeedbackAt: typeof candidate.qa?.lastFeedbackAt === 'number' ? candidate.qa.lastFeedbackAt : base.qa.lastFeedbackAt
    }
  };
}

function emitChange() {
  for (const listener of listeners) listener();
}

function persist(state: DemoRuntimeState, options?: { persistStorage?: boolean }) {
  memoryState = state;
  const shouldPersistStorage = options?.persistStorage ?? true;
  if (shouldPersistStorage && canUseStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent(STORE_EVENT));
    } catch {
      // Ignore storage failures in demo runtime.
    }
  }
  emitChange();
}

export function getDemoRuntimeState() {
  if (memoryState) return memoryState;

  if (!canUseStorage()) {
    memoryState = createInitialDemoRuntimeState();
    return memoryState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createInitialDemoRuntimeState();
      memoryState = seeded;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw) as Partial<DemoRuntimeState>;
    memoryState = normalize(parsed);
    return memoryState;
  } catch {
    memoryState = createInitialDemoRuntimeState();
    return memoryState;
  }
}

export function subscribeDemoRuntimeState(listener: () => void) {
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

export function updateDemoRuntimeState(
  updater: (prev: DemoRuntimeState) => DemoRuntimeState,
  options?: { persistStorage?: boolean }
) {
  const next = updater(cloneState(getDemoRuntimeState()));
  persist(next, options);
}

export function resetDemoRuntimeState() {
  persist(createInitialDemoRuntimeState());
}

function makeToastId() {
  return `toast_${Math.random().toString(36).slice(2, 10)}`;
}

export function pushDemoToast(message: string) {
  updateDemoRuntimeState((state) => {
    state.toasts.unshift({
      id: makeToastId(),
      message,
      createdAt: new Date().toISOString()
    });
    state.toasts = state.toasts.slice(0, 8);
    return state;
  }, { persistStorage: false });
}

export function dismissDemoToast(toastId: string) {
  updateDemoRuntimeState((state) => {
    state.toasts = state.toasts.filter((item) => item.id !== toastId);
    return state;
  }, { persistStorage: false });
}

export function setDemoTravelStatus(status: DemoTravelStatus) {
  updateDemoRuntimeState((state) => {
    state.travelStatus = status;
    return state;
  });
}

export function setDemoHighlightedDocument(documentId: string | null) {
  updateDemoRuntimeState((state) => {
    state.highlightedDocumentId = documentId;
    return state;
  });
}

export function setDemoScenarioToken(token: BenefitPassTokenResponse | null) {
  updateDemoRuntimeState((state) => {
    state.lastGeneratedToken = token;
    return state;
  });
}

export function startGuidedTour(scenarioId: string, stepIndex = 0) {
  updateDemoRuntimeState((state) => {
    state.tour = {
      active: true,
      scenarioId,
      stepIndex
    };
    state.activeScenarioId = scenarioId;
    return state;
  });
}

export function setGuidedTourStep(stepIndex: number) {
  updateDemoRuntimeState((state) => {
    if (!state.tour.active) return state;
    state.tour.stepIndex = Math.max(0, stepIndex);
    return state;
  });
}

export function stopGuidedTour() {
  updateDemoRuntimeState((state) => {
    state.tour.active = false;
    state.tour.scenarioId = null;
    state.tour.stepIndex = 0;
    if (state.activeScenarioId === 'guided-tour') {
      state.activeScenarioId = null;
    }
    return state;
  });
}

export function setPresenterActive(active: boolean) {
  updateDemoRuntimeState((state) => {
    state.presenter.active = active;
    if (!active) state.presenter.stepIndex = 0;
    return state;
  });
}

export function setPresenterStep(stepIndex: number) {
  updateDemoRuntimeState((state) => {
    state.presenter.stepIndex = Math.max(0, stepIndex);
    return state;
  });
}

export function setActiveDemoScenario(scenarioId: string | null) {
  updateDemoRuntimeState((state) => {
    state.activeScenarioId = scenarioId;
    return state;
  });
}

function makeQaLogId() {
  return `qa_${Math.random().toString(36).slice(2, 10)}`;
}

export function setQaMode(enabled: boolean) {
  updateDemoRuntimeState((state) => {
    state.qa.enabled = enabled;
    if (!enabled) {
      state.qa.clickLogs = [];
      state.qa.lastFeedbackAt = 0;
    }
    return state;
  });
}

export function logQaClick(input: Omit<QaClickLog, 'id' | 'timestamp'>) {
  if (!getDemoRuntimeState().qa.enabled) return;
  updateDemoRuntimeState((state) => {
    state.qa.clickLogs.unshift({
      id: makeQaLogId(),
      timestamp: new Date().toISOString(),
      ...input
    });
    state.qa.clickLogs = state.qa.clickLogs.slice(0, 250);
    return state;
  }, { persistStorage: false });
}

export function clearQaLogs() {
  updateDemoRuntimeState((state) => {
    state.qa.clickLogs = [];
    return state;
  }, { persistStorage: false });
}

export function markQaFeedback() {
  if (!getDemoRuntimeState().qa.enabled) return;
  updateDemoRuntimeState((state) => {
    state.qa.lastFeedbackAt = Date.now();
    return state;
  }, { persistStorage: false });
}
