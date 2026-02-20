'use client';

import { useEffect, useMemo, useState } from 'react';
import { Section } from '../Section';
import { addMessageToThread, markThreadRead } from '../../lib/storage/demo-store';
import { useDemoState } from '../../lib/storage/use-demo-state';
import { MessageComposer } from './MessageComposer';
import { localizeAuthority, localizeMessageBody } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

export function InboxThreads({ initialThreadId }: { initialThreadId?: string }) {
  const state = useDemoState();
  const { locale, t, formatDateTime } = useTranslation();

  const [selectedThreadId, setSelectedThreadId] = useState(() => {
    if (initialThreadId && state.messageThreads.some((thread) => thread.id === initialThreadId)) return initialThreadId;
    return state.messageThreads[0]?.id ?? null;
  });

  const [messageBody, setMessageBody] = useState('');
  const [attachmentId, setAttachmentId] = useState('');

  useEffect(() => {
    if (!selectedThreadId) return;
    markThreadRead(selectedThreadId);
  }, [selectedThreadId]);

  const threads = useMemo(
    () => [...state.messageThreads].sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1)),
    [state.messageThreads]
  );

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;

  return (
    <Section title={t('inbox.title')} action={t('inbox.threads_action', { count: threads.length })}>
      <div className="inbox-layout">
        <aside className="inbox-thread-list" aria-label={t('inbox.threads_aria')}>
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={`inbox-thread-item ${selectedThread?.id === thread.id ? 'inbox-thread-item-active' : ''}`}
              onClick={() => setSelectedThreadId(thread.id)}
            >
              <div>
                <p className="inbox-thread-title">{localizeAuthority(locale, thread.authority)}</p>
                <p className="inbox-thread-time">{formatDateTime(thread.lastMessageAt)}</p>
              </div>
              {thread.unreadCount > 0 ? <span className="sidebar-pill">{thread.unreadCount}</span> : null}
            </button>
          ))}
        </aside>

        <div className="inbox-thread-panel">
          {!selectedThread ? (
            <div className="wallet-empty-card">
              <h3>{t('inbox.no_thread_selected')}</h3>
              <p>{t('inbox.no_thread_selected_desc')}</p>
            </div>
          ) : (
            <>
              <header className="inbox-thread-header">
                <h3>{localizeAuthority(locale, selectedThread.authority)}</h3>
                <p className="mono">{t('inbox.secure_channel')}</p>
              </header>

              <div className="inbox-messages">
                {selectedThread.messages.map((message) => (
                  <article key={message.id} className={`message-bubble ${message.from === 'citizen' ? 'message-bubble-citizen' : ''}`}>
                    <p>{localizeMessageBody(locale, message.body)}</p>
                    {message.attachments?.length ? (
                      <ul className="request-upload-list">
                        {message.attachments.map((attachment) => (
                          <li key={attachment.id}>
                            {(() => {
                              const document = state.documents.find((item) => item.id === attachment.documentId);
                              return document ? t(`doc.${document.category}`, undefined, document.title) : attachment.title;
                            })()}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <small>{formatDateTime(message.at)}</small>
                  </article>
                ))}
              </div>

              <MessageComposer
                value={messageBody}
                onChange={setMessageBody}
                attachmentId={attachmentId}
                onAttachmentChange={setAttachmentId}
                documents={state.documents}
                disabled={!messageBody.trim()}
                onSubmit={() => {
                  if (!selectedThread || !messageBody.trim()) return;
                  const attachment = state.documents.find((item) => item.id === attachmentId);
                  addMessageToThread({
                    threadId: selectedThread.id,
                    from: 'citizen',
                    body: messageBody.trim(),
                    attachments: attachment
                      ? [
                          {
                            documentId: attachment.id,
                            title: attachment.title
                          }
                        ]
                      : undefined
                  });
                  setMessageBody('');
                  setAttachmentId('');
                }}
              />
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
