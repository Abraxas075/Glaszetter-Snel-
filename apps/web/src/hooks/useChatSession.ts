import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeChatMessages, type ChatMessage, type ChatPage } from '@glaszetter/shared';

export function useChatSession(load: (before?: string) => Promise<ChatPage>, active = true) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(false),
    [loading, setLoading] = useState(true),
    [olderLoading, setOlderLoading] = useState(false),
    [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const alive = useRef(true),
    oldest = useRef<string | null>(null),
    lastWindow = useRef(new Set<string>()),
    olderLocked = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const page = await load();
        if (!stopped) {
          const gap =
            lastWindow.current.size > 0 &&
            page.hasOlder &&
            !page.messages.some((message) => lastWindow.current.has(message.id));
          setMessages((previous) =>
            gap ? page.messages : mergeChatMessages(previous, page.messages)
          );
          lastWindow.current = new Set(page.messages.map((message) => message.id));
          if (!oldest.current || gap) {
            setHasOlder(page.hasOlder);
            oldest.current = page.messages[0]?.sequence || null;
          }
          setError('');
        }
      } catch {
        if (!stopped)
          setError('Verbinding verbroken. Je berichten blijven staan; we proberen opnieuw.');
      } finally {
        if (!stopped) {
          setLoading(false);
          timer = setTimeout(poll, 5000);
        }
      }
    }
    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [load, active, refresh]);
  const older = useCallback(async () => {
    if (olderLocked.current || !oldest.current) return;
    olderLocked.current = true;
    const cursor = oldest.current;
    setOlderLoading(true);
    try {
      const page = await load(cursor);
      if (alive.current && oldest.current === cursor) {
        setMessages((previous) => mergeChatMessages(previous, page.messages));
        setHasOlder(page.hasOlder);
        oldest.current = page.messages[0]?.sequence || oldest.current;
        setError('');
      }
    } catch {
      if (alive.current) setError('Oudere berichten laden is mislukt. Probeer opnieuw.');
    } finally {
      olderLocked.current = false;
      if (alive.current) setOlderLoading(false);
    }
  }, [load]);
  const append = useCallback((message: ChatMessage) => {
    if (alive.current) setMessages((previous) => mergeChatMessages(previous, [message]));
  }, []);
  return {
    messages,
    hasOlder,
    loading,
    olderLoading,
    error,
    older,
    append,
    retry: () => setRefresh((value) => value + 1),
  };
}
