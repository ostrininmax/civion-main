'use client';

import { useState, useTransition } from 'react';
import { createDocumentShareLink, type WalletShareLink } from '../../lib/client-api';
import { t } from '../../lib/i18n';
import { useDemoState } from '../../lib/storage/use-demo-state';

export function ShareDocumentButton({ documentId }: { documentId: string }) {
  const state = useDemoState();
  const [isPending, startTransition] = useTransition();
  const [share, setShare] = useState<WalletShareLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createDocumentShareLink(documentId);
            if (!result) {
              setError(t(state.locale, 'wallet.toast_share_created'));
              return;
            }
            setShare(result);
          });
        }}
        disabled={isPending}
        className="wallet-action"
        style={{ cursor: isPending ? 'not-allowed' : 'pointer' }}
      >
        {isPending ? t(state.locale, 'wallet.drawer_generating_share') : t(state.locale, 'wallet.action_share_proof')}
      </button>
      {share ? <span className="wallet-action-meta">{share.shareId}</span> : null}
      {error ? <span className="wallet-action-error">{error}</span> : null}
    </div>
  );
}
