'use client';

import type { CitizenDocument } from '../../lib/models/types';
import { t } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

export function MessageComposer({
  value,
  onChange,
  attachmentId,
  onAttachmentChange,
  documents,
  onSubmit,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  attachmentId: string;
  onAttachmentChange: (value: string) => void;
  documents: CitizenDocument[];
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const state = useDemoState();

  return (
    <div className="inbox-compose">
      <label className="wallet-query-label" htmlFor="compose-message">
        {t(state.locale, 'inbox.reply')}
      </label>
      <textarea
        id="compose-message"
        className="wallet-inline-textarea"
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t(state.locale, 'inbox.reply_placeholder')}
      />

      <label className="wallet-query-label" htmlFor="compose-attachment">
        {t(state.locale, 'inbox.attach_from_vault')}
      </label>
      <select
        id="compose-attachment"
        className="wallet-field"
        value={attachmentId}
        onChange={(event) => onAttachmentChange(event.target.value)}
      >
        <option value="">{t(state.locale, 'common.no_attachment')}</option>
        {documents.map((document) => (
          <option key={document.id} value={document.id}>
            {t(state.locale, `doc.${document.category}`, document.title)}
          </option>
        ))}
      </select>

      <div className="wallet-inline-actions">
        <button type="button" className="wallet-action wallet-action-primary" disabled={disabled} onClick={onSubmit}>
          {t(state.locale, 'inbox.submit_reply')}
        </button>
      </div>
    </div>
  );
}
