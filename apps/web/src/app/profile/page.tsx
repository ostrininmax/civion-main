'use client';

import { useMemo, useState } from 'react';
import { Section } from '../../components/Section';
import { updateProfileFields } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { useTranslation } from '../../lib/i18n/context';

export default function ProfilePage() {
  const state = useDemoState();
  const { t } = useTranslation();
  const [draft, setDraft] = useState(state.profile);
  const [saved, setSaved] = useState(false);

  const readiness = useMemo(() => {
    const required = [draft.fullName, draft.dateOfBirth, draft.address, draft.phone, draft.email, draft.emergencyContact];
    const fieldsPercent = Math.round((required.filter(Boolean).length / required.length) * 100);
    const docsBonus = Math.min(20, state.documents.length * 2);
    return Math.min(100, Math.round(fieldsPercent * 0.8 + docsBonus));
  }, [draft, state.documents.length]);

  return (
    <Section title={t('profile.title')} action={t('profile.action', { percent: readiness })}>
      <div className="settings-grid">
        <article className="settings-card">
          <div className="badge">{t('profile.completion_badge')}</div>
          <p className="settings-text">{t('profile.completion_desc')}</p>
          <div className="wallet-flow-details">
            <p>
              <span>{t('profile.readiness_score')}</span>
              <strong>{readiness}%</strong>
            </p>
          </div>
        </article>

        <article className="settings-card">
          <label className="wallet-inline-label" htmlFor="profile-name">
            {t('profile.full_name')}
          </label>
          <input
            id="profile-name"
            className="wallet-field"
            value={draft.fullName}
            onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
          />

          <label className="wallet-inline-label" htmlFor="profile-dob">
            {t('profile.date_of_birth')}
          </label>
          <input
            id="profile-dob"
            className="wallet-field"
            value={draft.dateOfBirth}
            onChange={(event) => setDraft((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
          />

          <label className="wallet-inline-label" htmlFor="profile-address">
            {t('profile.address')}
          </label>
          <input
            id="profile-address"
            className="wallet-field"
            value={draft.address}
            onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
          />

          <label className="wallet-inline-label" htmlFor="profile-phone">
            {t('profile.phone')}
          </label>
          <input
            id="profile-phone"
            className="wallet-field"
            value={draft.phone}
            onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
          />

          <label className="wallet-inline-label" htmlFor="profile-email">
            {t('profile.email')}
          </label>
          <input
            id="profile-email"
            className="wallet-field"
            value={draft.email}
            onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
          />

          <label className="wallet-inline-label" htmlFor="profile-emergency">
            {t('profile.emergency_contact')}
          </label>
          <input
            id="profile-emergency"
            className="wallet-field"
            value={draft.emergencyContact}
            onChange={(event) => setDraft((prev) => ({ ...prev, emergencyContact: event.target.value }))}
          />

          <div className="wallet-inline-actions">
            <button
              type="button"
              className="wallet-action wallet-action-primary"
              onClick={() => {
                updateProfileFields(draft);
                setSaved(true);
                window.setTimeout(() => setSaved(false), 2000);
              }}
            >
              {t('profile.save')}
            </button>
          </div>
          {saved ? <p className="wallet-action-meta">{t('profile.updated')}</p> : null}
        </article>
      </div>
    </Section>
  );
}
