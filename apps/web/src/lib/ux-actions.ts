'use client';

import type { AppNotification, RequestStatus, ServiceRequest, VerificationEvent } from './models/types';
import { logQaClick, markQaFeedback, pushDemoToast } from './demo/runtime-store';
import { addVerificationEvent, updateDemoState, upsertRequest } from './storage/demo-store';

type RouterLike = {
  push: (href: string) => void;
  replace?: (href: string) => void;
};

function currentPath() {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}`;
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function qaLogAction(label: string, action: string) {
  logQaClick({
    label,
    action,
    path: currentPath()
  });
}

export function toastSuccess(message: string, label = 'toast') {
  pushDemoToast(message);
  qaLogAction(label, 'toast_success');
  markQaFeedback();
}

export function toastError(message: string, label = 'toast') {
  pushDemoToast(message);
  qaLogAction(label, 'toast_error');
  markQaFeedback();
}

export function navigateTo(router: RouterLike, href: string, options?: { replace?: boolean; label?: string }) {
  if (options?.replace && router.replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
  qaLogAction(options?.label ?? href, options?.replace ? 'navigate_replace' : 'navigate_push');
  markQaFeedback();
}

export function openModal(setOpen: (value: boolean) => void, label: string) {
  setOpen(true);
  qaLogAction(label, 'open_modal');
  markQaFeedback();
}

export function closeModal(setOpen: (value: boolean) => void, label: string) {
  setOpen(false);
  qaLogAction(label, 'close_modal');
  markQaFeedback();
}

export function logAuditEvent(event: Omit<VerificationEvent, 'id' | 'at'> & { at?: string }, label = 'audit') {
  addVerificationEvent(event);
  qaLogAction(label, 'audit_event');
  markQaFeedback();
}

export function pushNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
  label = 'notification'
) {
  updateDemoState((state) => {
    state.notifications.unshift({
      id: makeId('ntf'),
      createdAt: new Date().toISOString(),
      read: false,
      ...notification
    });
    state.notifications = state.notifications.slice(0, 80);
    return state;
  });
  qaLogAction(label, 'push_notification');
  markQaFeedback();
}

export function createOrUpdateRequest(request: ServiceRequest, status?: RequestStatus, timelineTitle = 'Request updated') {
  const payload = status ? { ...request, status } : request;
  upsertRequest(payload, timelineTitle);
  qaLogAction(request.reference, 'upsert_request');
  markQaFeedback();
}
