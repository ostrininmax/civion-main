import type { LocaleCode, RequestStatus } from './models/types';
import { t } from './i18n';

export function statusToneForRequest(status: RequestStatus) {
  if (status === 'approved' || status === 'completed') return 'success' as const;
  if (status === 'rejected') return 'critical' as const;
  if (status === 'appointment_required') return 'warning' as const;
  return 'neutral' as const;
}

export function statusLabelForRequest(status: RequestStatus, locale: LocaleCode) {
  if (status === 'draft') return t(locale, 'status.draft');
  if (status === 'submitted') return t(locale, 'status.submitted');
  if (status === 'in_review') return t(locale, 'status.in_review');
  if (status === 'approved') return t(locale, 'status.approved');
  if (status === 'rejected') return t(locale, 'status.rejected');
  if (status === 'appointment_required') return t(locale, 'status.appointment_required');
  return t(locale, 'status.completed');
}
