'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../lib/i18n/context';

function toSecondsLeft(expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function VerifyExpiryTimer({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(() => toSecondsLeft(expiresAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(toSecondsLeft(expiresAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const label = useMemo(() => {
    if (secondsLeft <= 0) return t('verify.expired');
    return formatDuration(secondsLeft);
  }, [secondsLeft, t]);

  return (
    <p className="civic-verify-timer" aria-live="polite">
      {t('verify.expiration_timer', { label })}
    </p>
  );
}
