'use client';
import { useCallback, useEffect, useRef } from 'react';

// Covers refresh/tab close, ordinary links and the browser Back button.
export function useUnsavedWarning(dirty: boolean, message: string, busy: boolean) {
  const bypass = useRef(false);
  const current = useRef({ dirty, message, busy });
  current.current = { dirty, message, busy };
  const allowLeave = useCallback(() => { bypass.current = true; }, []);
  useEffect(() => {
    if (!dirty) return;
    const key = '__emergencyDraftGuard';
    const original = window.history.state;
    window.history.pushState({ ...original, [key]: true }, '', window.location.href);
    const confirmLeave = () => bypass.current || (!current.current.busy && window.confirm(current.current.message));
    const unload = (event: BeforeUnloadEvent) => {
      if (!bypass.current && current.current.dirty) { event.preventDefault(); event.returnValue = ''; }
    };
    const click = (event: MouseEvent) => {
      if (bypass.current || !current.current.dirty || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === '_blank' || target.hasAttribute('download')) return;
      const url = new URL(target.href);
      if (!['http:', 'https:'].includes(url.protocol) || (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search)) return;
      if (!confirmLeave()) { event.preventDefault(); event.stopImmediatePropagation(); }
      else bypass.current = true;
    };
    const back = (event: PopStateEvent) => {
      if (bypass.current || !current.current.dirty) return;
      event.stopImmediatePropagation();
      if (confirmLeave()) { bypass.current = true; window.history.back(); }
      else window.history.pushState({ ...original, [key]: true }, '', window.location.href);
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', back, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
      window.removeEventListener('popstate', back, true);
      if (window.history.state?.[key]) window.history.replaceState(original, '', window.location.href);
    };
  }, [dirty]);
  return allowLeave;
}
