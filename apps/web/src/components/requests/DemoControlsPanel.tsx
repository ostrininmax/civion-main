'use client';

import { useMemo, useState } from 'react';
import type { RequestStatus } from '../../lib/models/types';
import { addMessageToThread, setRequestStatus } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { statusLabelForRequest } from '../../lib/status';
import { ti } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

const allStatuses: RequestStatus[] = [
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'appointment_required',
  'completed'
];

export function DemoControlsPanel({ requestId, currentStatus }: { requestId: string; currentStatus: RequestStatus }) {
  const state = useDemoState();
  const { t } = useTranslation();
  const [nextStatus, setNextStatus] = useState<RequestStatus>(currentStatus);

  const linkedThreadId = useMemo(
    () => state.messageThreads.find((thread) => thread.linkedRequestId === requestId)?.id,
    [requestId, state.messageThreads]
  );

  return (
    <aside className="card demo-controls-panel" aria-label={t('requests.demo_controls')}>
      <p className="wallet-stat-label">{t('requests.demo_controls')}</p>
      <h3>{t('requests.simulate_lifecycle')}</h3>

      <label className="wallet-query-label" htmlFor={`status-${requestId}`}>
        {t('requests.request_status')}
      </label>
      <select
        id={`status-${requestId}`}
        className="wallet-field"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as RequestStatus)}
      >
        {allStatuses.map((status) => (
          <option key={status} value={status}>
            {statusLabelForRequest(status, state.locale)}
          </option>
        ))}
      </select>

      <div className="demo-controls-actions">
        <button
          type="button"
          className="wallet-action wallet-action-primary"
          onClick={() => {
            setRequestStatus(requestId, nextStatus, ti(state.locale, 'requests.demo_update', { status: nextStatus.replace('_', ' ') }));
          }}
        >
          {t('requests.apply_status')}
        </button>

        <button
          type="button"
          className="wallet-action"
          disabled={!linkedThreadId}
          onClick={() => {
            if (!linkedThreadId) return;
            addMessageToThread({
              threadId: linkedThreadId,
              from: 'authority',
              body: t('requests.demo_authority_update')
            });
          }}
        >
          {t('requests.add_authority_message')}
        </button>
      </div>
    </aside>
  );
}
