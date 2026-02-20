import type { ProcessInstance } from './api';

type ServiceAccent = 'blue' | 'green' | 'orange' | 'pink';

type ServiceVisual = {
  shortCode: string;
  localLabel: string;
  accent: ServiceAccent;
  callToAction: string;
};

const serviceVisuals: Record<string, ServiceVisual> = {
  'register-ltd': {
    shortCode: 'LTD',
    localLabel: 'Εγγραφή Εταιρείας',
    accent: 'blue',
    callToAction: 'Apply online'
  },
  'temp-residence': {
    shortCode: 'TRP',
    localLabel: 'Άδεια Παραμονής',
    accent: 'green',
    callToAction: 'Book & apply'
  },
  'tax-id': {
    shortCode: 'TIN',
    localLabel: 'Φορολογική Ταυτότητα',
    accent: 'orange',
    callToAction: 'Request number'
  }
};

export function getServiceVisual(processId: string, fallbackName: string): ServiceVisual {
  const known = serviceVisuals[processId];
  if (known) return known;

  return {
    shortCode: fallbackName.slice(0, 3).toUpperCase(),
    localLabel: 'Digital government service',
    accent: 'pink',
    callToAction: 'Open service'
  };
}

export const processStatusLabel: Record<ProcessInstance['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  completed: 'Completed'
};

export function processStatusTone(status: ProcessInstance['status']): 'neutral' | 'warning' | 'success' {
  if (status === 'completed') return 'success';
  if (status === 'submitted') return 'warning';
  return 'neutral';
}
