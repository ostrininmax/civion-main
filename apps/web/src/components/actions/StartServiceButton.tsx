'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startProcess } from '../../lib/client-api';
import { t } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

export function StartServiceButton({
  processId,
  forceNew = false,
  label
}: {
  processId: string;
  forceNew?: boolean;
  label?: string;
}) {
  const state = useDemoState();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startProcess(processId, { forceNew });
            if (!result) {
              setError(t(state.locale, 'processes.start_failed'));
              return;
            }
            router.refresh();
          });
        }}
        disabled={isPending}
        className="wallet-action"
        style={{ cursor: isPending ? 'not-allowed' : 'pointer' }}
      >
        {isPending ? t(state.locale, 'processes.starting') : label ?? t(state.locale, 'processes.start_service')}
      </button>
      {error ? <span style={{ color: 'var(--critical)', fontSize: 12 }}>{error}</span> : null}
    </div>
  );
}
