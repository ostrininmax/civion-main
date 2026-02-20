'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTimelineReminder } from '../../lib/client-api';
import { t } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

export function SetReminderButton({
  title,
  dueDate,
  severity = 'important'
}: {
  title: string;
  dueDate?: string;
  severity?: 'informational' | 'important' | 'critical';
}) {
  const state = useDemoState();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!dueDate) {
    return (
      <span className="wallet-action-meta" style={{ opacity: 0.7 }}>
        {t(state.locale, 'wallet.reminder_unavailable')}
      </span>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createTimelineReminder({
              title,
              dueDate,
              severity,
              source: 'document'
            });
            if (!result) {
              setError(t(state.locale, 'wallet.reminder_failed'));
              return;
            }
            router.refresh();
          });
        }}
        disabled={isPending}
        className="wallet-action"
        style={{ cursor: isPending ? 'not-allowed' : 'pointer' }}
      >
        {isPending ? t(state.locale, 'wallet.saving') : t(state.locale, 'wallet.set_reminder')}
      </button>
      {error ? <span className="wallet-action-error">{error}</span> : null}
    </div>
  );
}
