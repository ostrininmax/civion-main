'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeProcess, completeProcessStep, submitProcess } from '../../lib/client-api';
import { t } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

export function ProcessStepActionButton({ instanceId, stepIndex, disabled }: { instanceId: string; stepIndex: number; disabled: boolean }) {
  const state = useDemoState();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button
        type="button"
        className="wallet-action"
        disabled={disabled || isPending}
        style={{ cursor: disabled || isPending ? 'not-allowed' : 'pointer' }}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await completeProcessStep(instanceId, stepIndex);
            if (!result) {
              setError(t(state.locale, 'processes.step_failed'));
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending ? t(state.locale, 'processes.step_saving') : t(state.locale, 'processes.mark_step_complete')}
      </button>
      {error ? <span style={{ color: 'var(--critical)', fontSize: 12 }}>{error}</span> : null}
    </div>
  );
}

export function ProcessStatusActions({ instanceId, canSubmit, canComplete }: { instanceId: string; canSubmit: boolean; canComplete: boolean }) {
  const state = useDemoState();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        className="wallet-action wallet-action-primary"
        disabled={!canSubmit || isPending}
        style={{ cursor: !canSubmit || isPending ? 'not-allowed' : 'pointer' }}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await submitProcess(instanceId);
            if (!result) {
              setError(t(state.locale, 'processes.submit_failed'));
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending && canSubmit ? t(state.locale, 'processes.submitting') : t(state.locale, 'processes.submit_application')}
      </button>
      <button
        type="button"
        className="wallet-action"
        disabled={!canComplete || isPending}
        style={{ cursor: !canComplete || isPending ? 'not-allowed' : 'pointer' }}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await completeProcess(instanceId);
            if (!result) {
              setError(t(state.locale, 'processes.complete_failed'));
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending && canComplete ? t(state.locale, 'processes.finalizing') : t(state.locale, 'processes.mark_approved')}
      </button>
      {error ? <span style={{ color: 'var(--critical)', fontSize: 12 }}>{error}</span> : null}
    </div>
  );
}
