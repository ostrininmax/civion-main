'use client';

import { useSyncExternalStore } from 'react';
import type { DemoRuntimeState } from './runtime-store';
import { getDemoRuntimeState, subscribeDemoRuntimeState } from './runtime-store';

const serverSnapshot: DemoRuntimeState = {
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

export function useDemoRuntimeState() {
  return useSyncExternalStore(subscribeDemoRuntimeState, getDemoRuntimeState, () => serverSnapshot);
}
