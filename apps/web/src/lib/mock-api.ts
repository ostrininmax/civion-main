import type {
  Appointment,
  AppNotification,
  CitizenDocument,
  ConsentRecord,
  MessageThread,
  ServiceDefinition,
  ServiceRequest,
  VerificationEvent
} from './models/types';
import { SERVICE_DEFINITIONS } from './mockData/definitions';
import { getDemoState } from './storage/demo-store';

export function getMockDocuments(): CitizenDocument[] {
  return getDemoState().documents;
}

export function getMockRequests(): ServiceRequest[] {
  return getDemoState().requests;
}

export function getMockThreads(): MessageThread[] {
  return getDemoState().messageThreads;
}

export function getMockAppointments(): Appointment[] {
  return getDemoState().appointments;
}

export function getMockNotifications(): AppNotification[] {
  return getDemoState().notifications;
}

export function getMockVerificationEvents(): VerificationEvent[] {
  return getDemoState().verificationEvents;
}

export function getMockConsents(): ConsentRecord[] {
  return getDemoState().consents;
}

export function getMockServices(): ServiceDefinition[] {
  return SERVICE_DEFINITIONS;
}
