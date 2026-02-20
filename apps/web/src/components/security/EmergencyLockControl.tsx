'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SecurityLockType } from '../../lib/models/types';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { activateEmergencyLock, unlockEmergencyLock } from '../../lib/storage/demo-store';
import { useTranslation } from '../../lib/i18n/context';
import { closeModal, openModal, toastError, toastSuccess } from '../../lib/ux-actions';

type LockDuration = '1h' | '24h' | 'manual';

export function EmergencyLockControl({ compact = false }: { compact?: boolean }) {
  const state = useDemoState();
  const { t, formatDateTime } = useTranslation();
  const [open, setOpen] = useState(false);
  const [lockType, setLockType] = useState<SecurityLockType>('soft');
  const [duration, setDuration] = useState<LockDuration>('manual');
  const [pin, setPin] = useState('');
  const [useFaceId, setUseFaceId] = useState(false);

  const security = state.accountSecurity;
  const isLocked = Boolean(security.isLocked && security.lockedAt);

  useEffect(() => {
    if (!security.lockedAt) return;
    setLockType(security.lockType);
    if (security.lockDuration === 60 * 60 * 1000) {
      setDuration('1h');
      return;
    }
    if (security.lockDuration === 24 * 60 * 60 * 1000) {
      setDuration('24h');
      return;
    }
    setDuration('manual');
  }, [security.lockDuration, security.lockType, security.lockedAt]);

  const resetUnlockForm = () => {
    setPin('');
    setUseFaceId(false);
  };

  const handleActivate = () => {
    activateEmergencyLock({
      lockType,
      duration,
      source: 'Emergency lock UI'
    });
    toastSuccess(t('security.lock_activated'), 'security.activate_lock');
    closeModal(setOpen, 'security.lock_modal_close');
    resetUnlockForm();
  };

  const handleUnlock = () => {
    const result = unlockEmergencyLock({
      pin,
      usedFaceId: useFaceId,
      source: 'manual'
    });

    if (!result.ok) {
      toastError(t('security.unlock_failed'), 'security.unlock_error');
      return;
    }

    toastSuccess(t('security.unlock_success'), 'security.unlock_success');
    closeModal(setOpen, 'security.lock_modal_close');
    resetUnlockForm();
  };

  return (
    <div className={compact ? 'security-lock-control security-lock-control-compact' : 'security-lock-control'}>
      {!compact ? (
        <div className="security-lock-summary">
          <p className="wallet-stat-label">{t('security.emergency_title')}</p>
          <p className="settings-text">{t('security.emergency_desc')}</p>
          {isLocked ? (
            <>
              <p className="security-lock-meta">{t('security.locked_since', { date: formatDateTime(security.lockedAt ?? '') })}</p>
              {security.lockedUntil ? (
                <p className="security-lock-meta">{t('security.locked_until', { date: formatDateTime(security.lockedUntil) })}</p>
              ) : null}
              {security.lockType === 'hard' ? (
                <p className="security-lock-meta">{t('security.hard_lock_hint')}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={`wallet-action ${isLocked ? 'wallet-action-critical' : compact ? 'wallet-action-soft' : 'wallet-action-critical'}`}
        onClick={() => openModal(setOpen, 'security.lock_modal_open')}
      >
        {t('security.emergency_title')}
      </button>

      {open ? (
        <div
          className="wallet-inline-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal(setOpen, 'security.lock_modal_close');
            }
          }}
        >
          <div className="wallet-inline-modal security-lock-modal" role="dialog" aria-modal="true" aria-labelledby="security-lock-title">
            <h4 id="security-lock-title">{t('security.emergency_title')}</h4>

            {!isLocked ? (
              <>
                <div className="security-lock-group">
                  <p className="wallet-query-label">{t('security.lock_type')}</p>
                  <label className="wallet-flow-check">
                    <input
                      type="radio"
                      name="lock-type"
                      checked={lockType === 'soft'}
                      onChange={() => setLockType('soft')}
                    />
                    <span>{t('security.lock_type_soft')}</span>
                  </label>
                  <label className="wallet-flow-check">
                    <input
                      type="radio"
                      name="lock-type"
                      checked={lockType === 'hard'}
                      onChange={() => setLockType('hard')}
                    />
                    <span>{t('security.lock_type_hard')}</span>
                  </label>
                </div>

                <div className="security-lock-group">
                  <p className="wallet-query-label">{t('security.lock_duration')}</p>
                  <div className="wallet-filter-bar">
                    <button
                      type="button"
                      className={`wallet-filter-chip ${duration === '1h' ? 'wallet-filter-chip-active' : ''}`}
                      onClick={() => setDuration('1h')}
                    >
                      {t('security.duration_1h')}
                    </button>
                    <button
                      type="button"
                      className={`wallet-filter-chip ${duration === '24h' ? 'wallet-filter-chip-active' : ''}`}
                      onClick={() => setDuration('24h')}
                    >
                      {t('security.duration_24h')}
                    </button>
                    <button
                      type="button"
                      className={`wallet-filter-chip ${duration === 'manual' ? 'wallet-filter-chip-active' : ''}`}
                      onClick={() => setDuration('manual')}
                    >
                      {t('security.duration_manual')}
                    </button>
                  </div>
                </div>

                {lockType === 'hard' ? <p className="civic-verify-reason">{t('security.hard_lock_hint')}</p> : null}

                <div className="wallet-inline-actions">
                  <button
                    type="button"
                    className="wallet-action wallet-action-soft"
                    onClick={() => closeModal(setOpen, 'security.lock_modal_close')}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="button" className="wallet-action wallet-action-critical" onClick={handleActivate}>
                    {t('security.activate_lock')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="security-lock-meta">{t('security.locked_state')}</p>
                <p className="security-lock-meta">{t('security.locked_since', { date: formatDateTime(security.lockedAt ?? '') })}</p>
                {security.lockedUntil ? (
                  <p className="security-lock-meta">{t('security.locked_until', { date: formatDateTime(security.lockedUntil) })}</p>
                ) : null}

                <label className="wallet-inline-label" htmlFor="unlock-pin-input">
                  {t('security.pin_label')}
                </label>
                <input
                  id="unlock-pin-input"
                  className="wallet-field"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder={t('security.pin_placeholder')}
                  autoFocus
                />

                <label className="wallet-flow-check">
                  <input type="checkbox" checked={useFaceId} onChange={(event) => setUseFaceId(event.target.checked)} />
                  <span>{t('security.face_id')}</span>
                </label>

                {security.lockType === 'hard' ? (
                  <Link href="/services/national-id-reissue" className="section-action-link">
                    {t('security.start_reissue')}
                  </Link>
                ) : null}

                <div className="wallet-inline-actions">
                  <button
                    type="button"
                    className="wallet-action wallet-action-soft"
                    onClick={() => closeModal(setOpen, 'security.lock_modal_close')}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="wallet-action wallet-action-primary"
                    onClick={handleUnlock}
                    disabled={pin.trim().length < 4}
                  >
                    {t('security.unlock_action')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
