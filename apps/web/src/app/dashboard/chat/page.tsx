'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  newChatClientId,
  normalizeChatText,
  safeMediaUrl,
  MEDIA_ACCEPT,
  MEDIA_MAX_BYTES,
  PHOTO_MAX_BYTES,
  type ChatChannel,
  type ChatMessage,
  type ChatPage,
} from '@glaszetter/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { apiRequest } from '../../../lib/api';
import { useChatSession } from '../../../hooks/useChatSession';
import styles from './chat.module.css';
type Draft = { text: string; clientId: string; file: File | null };
const empty = (): Draft => ({ text: '', clientId: newChatClientId(), file: null });
export default function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]),
    [selected, setSelected] = useState<ChatChannel | null>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [drafts, setDrafts] = useState<Record<string, Draft>>({});
  useEffect(() => {
    let active = true;
    setChannels([]);
    setSelected(null);
    setDrafts({});
    setError('');
    apiRequest<ChatChannel[]>('/chat/channels')
      .then((value) => {
        if (active) {
          setChannels(value);
          setSelected(value[0] || null);
        }
      })
      .catch(() => {
        if (active) setError('Gesprekken laden is mislukt.');
      });
    return () => {
      active = false;
    };
  }, [user?.id, revision]);
  return (
    <section className={styles.page}>
      <h1>Chat</h1>
      <p className={styles.subtitle}>Kantoor, team en klusgesprekken binnen je eigen bedrijf.</p>
      {error && (
        <p role="alert">
          {error} <button onClick={() => setRevision((v) => v + 1)}>Opnieuw laden</button>
        </p>
      )}
      <div className={styles.shell}>
        <nav className={styles.channels} aria-label="Gesprekken">
          {channels.map((channel) => (
            <button
              key={channel.id}
              aria-current={selected?.id === channel.id ? 'page' : undefined}
              onClick={() => {
                if (!drafts[channel.id])
                  setDrafts((previous) => ({ ...previous, [channel.id]: empty() }));
                setSelected(channel);
              }}
            >
              <span>{channel.name}</span>
              <small>
                {channel.kind === 'company'
                  ? 'Kantoor & team'
                  : drafts[channel.id]?.text
                    ? 'Concept bewaard'
                    : 'Klusgesprek'}
              </small>
            </button>
          ))}
        </nav>
        {selected && user ? (
          <Conversation
            key={`${user.id}:${selected.id}`}
            channel={selected}
            userId={user.id}
            draft={drafts[selected.id] || empty()}
            update={(value) => setDrafts((previous) => ({ ...previous, [selected.id]: value }))}
            sent={(id) =>
              setDrafts((previous) =>
                previous[selected.id]?.clientId === id
                  ? { ...previous, [selected.id]: empty() }
                  : previous
              )
            }
          />
        ) : (
          <p>Gesprekken laden…</p>
        )}
      </div>
    </section>
  );
}
function Conversation({
  channel,
  userId,
  draft,
  update,
  sent,
}: {
  channel: ChatChannel;
  userId: string;
  draft: Draft;
  update: (value: Draft) => void;
  sent: (id: string) => void;
}) {
  const load = useCallback(
    (before?: string) =>
      apiRequest<ChatPage>(
        `/chat/channels/${channel.id}/messages${before ? `?before=${before}` : ''}`
      ),
    [channel.id]
  );
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const change = () => setVisible(document.visibilityState !== 'hidden');
    change();
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  const session = useChatSession(load, visible),
    [sending, setSending] = useState(false),
    [sendError, setSendError] = useState('');
  const alive = useRef(true),
    locked = useRef(false),
    list = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true),
    fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (nearBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [session.messages.length]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (locked.current || (!draft.file && !normalizeChatText(draft.text))) return;
    locked.current = true;
    setSending(true);
    setSendError('');
    const snapshot = draft;
    try {
      let message: ChatMessage;
      if (snapshot.file) {
        const body = new FormData();
        body.append('file', snapshot.file);
        body.append('text', snapshot.text);
        body.append('clientId', snapshot.clientId);
        message = await apiRequest<ChatMessage>(`/chat/channels/${channel.id}/attachments`, {
          method: 'POST',
          body,
        });
      } else
        message = await apiRequest<ChatMessage>(`/chat/channels/${channel.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ text: snapshot.text, clientId: snapshot.clientId }),
        });
      sent(snapshot.clientId);
      if (alive.current) {
        nearBottom.current = true;
        session.append(message);
        if (fileInput.current) fileInput.current.value = '';
      }
    } catch {
      if (alive.current)
        setSendError('Versturen niet bevestigd. Je bericht blijft staan; probeer opnieuw.');
    } finally {
      locked.current = false;
      if (alive.current) setSending(false);
    }
  }
  return (
    <div className={styles.conversation}>
      <header>
        <h2>{channel.name}</h2>
        <small>Zichtbaar voor je bedrijf · automatisch vernieuwd</small>
      </header>
      {session.error && (
        <p role="alert">
          {session.error} <button onClick={session.retry}>Opnieuw laden</button>
        </p>
      )}
      <div
        ref={list}
        className={styles.messages}
        onScroll={() => {
          const el = list.current;
          if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
        }}
      >
        {session.hasOlder && (
          <button
            disabled={session.olderLoading}
            onClick={() => {
              nearBottom.current = false;
              void session.older();
            }}
          >
            {session.olderLoading ? 'Laden…' : 'Oudere berichten'}
          </button>
        )}
        {session.loading ? (
          <p>Laden…</p>
        ) : !session.messages.length && !session.error ? (
          <p>Nog geen berichten. Begin het gesprek.</p>
        ) : null}
        {session.messages.map((message) => (
          <article
            key={message.id}
            className={`${styles.bubble} ${message.senderId === userId ? styles.own : ''}`}
          >
            <small>{message.senderName}</small>
            {message.attachment &&
              safeMediaUrl(message.attachment.url) &&
              (message.attachment.kind === 'video' ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={safeMediaUrl(message.attachment.url)!}
                  aria-label={message.attachment.filename}
                />
              ) : (
                <a
                  href={safeMediaUrl(message.attachment.url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={safeMediaUrl(message.attachment.url)!}
                    alt={message.text || message.attachment.filename}
                    loading="lazy"
                  />
                </a>
              ))}
            {!!message.text && <p>{message.text}</p>}
            <time dateTime={message.createdAt}>
              {new Date(message.createdAt).toLocaleString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </article>
        ))}
      </div>
      <form className={styles.composer} onSubmit={send}>
        {sendError && <p role="alert">{sendError}</p>}
        <label className={styles.file}>
          Foto of video (optioneel)
          <input
            ref={fileInput}
            type="file"
            accept={MEDIA_ACCEPT}
            disabled={sending}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (
                file &&
                (file.size > MEDIA_MAX_BYTES ||
                  (file.type.startsWith('image/') && file.size > PHOTO_MAX_BYTES))
              ) {
                setSendError('Foto maximaal 15 MB; video maximaal 50 MB.');
                event.target.value = '';
                return;
              }
              update({ ...draft, file, clientId: newChatClientId() });
              setSendError('');
            }}
          />
        </label>
        {draft.file && (
          <p>
            {draft.file.name}{' '}
            <button
              type="button"
              disabled={sending}
              onClick={() => {
                update({ ...draft, file: null, clientId: newChatClientId() });
                if (fileInput.current) fileInput.current.value = '';
              }}
            >
              Bijlage wissen
            </button>
          </p>
        )}
        <div className={styles.composeRow}>
          <textarea
            aria-label="Bericht"
            placeholder="Schrijf een bericht…"
            rows={2}
            maxLength={4000}
            disabled={sending}
            value={draft.text}
            onChange={(e) =>
              update({ ...draft, text: e.target.value, clientId: newChatClientId() })
            }
          />
          <button
            type="submit"
            disabled={sending || (!draft.file && !normalizeChatText(draft.text))}
          >
            {sending ? 'Versturen…' : 'Versturen'}
          </button>
        </div>
      </form>
    </div>
  );
}
