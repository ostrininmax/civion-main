export type ProcessStatus = 'not_started' | 'in_progress' | 'submitted' | 'completed';

export type ProcessInstance = {
  id: string;
  processId: string;
  status: ProcessStatus;
  completedSteps: number[];
  currentStep: number;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

export type ProcessStepState = {
  index: number;
  title: string;
  completed: boolean;
  available: boolean;
};

export type ProcessDocumentState = {
  category: string;
  present: boolean;
  filename?: string;
  documentId?: string;
};

export type ProcessFlow = {
  processId: string;
  status: ProcessStatus | 'not_started';
  instance: ProcessInstance | null;
  steps: ProcessStepState[];
  requiredDocuments: ProcessDocumentState[];
  completedStepCount: number;
  totalStepCount: number;
  progressPercent: number;
  canSubmit: boolean;
  canComplete: boolean;
  blockers: string[];
};
