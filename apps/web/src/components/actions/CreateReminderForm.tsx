'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createTimelineReminder } from '../../lib/client-api';
import { t } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

export function CreateReminderForm() {
  const state = useDemoState();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [severity, setSeverity] = useState<'informational' | 'important' | 'critical'>('important');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createTimelineReminder({
        title,
        dueDate: new Date(dueDate).toISOString(),
        severity,
        source: 'manual'
      });

      if (!result) {
        setError(t(state.locale, 'reminder.create_failed'));
        return;
      }

      setTitle('');
      setDueDate('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t(state.locale, 'reminder.title_placeholder')}
        required
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15, 17, 19, 0.2)' }}
      />
      <input
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        type="datetime-local"
        required
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15, 17, 19, 0.2)' }}
      />
      <select
        value={severity}
        onChange={(event) => setSeverity(event.target.value as 'informational' | 'important' | 'critical')}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15, 17, 19, 0.2)' }}
      >
        <option value="informational">{t(state.locale, 'reminder.severity.informational')}</option>
        <option value="important">{t(state.locale, 'reminder.severity.important')}</option>
        <option value="critical">{t(state.locale, 'reminder.severity.critical')}</option>
      </select>
      <button type="submit" className="wallet-action" style={{ width: 'fit-content', cursor: 'pointer' }}>
        {isPending ? t(state.locale, 'reminder.creating') : t(state.locale, 'reminder.add')}
      </button>
      {error ? <span style={{ color: 'var(--critical)', fontSize: 12 }}>{error}</span> : null}
    </form>
  );
}
