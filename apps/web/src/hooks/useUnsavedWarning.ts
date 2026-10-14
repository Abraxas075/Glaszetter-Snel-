'use client';
import { useCallback, useEffect, useRef } from 'react';
import { installUnsavedWarning } from '../lib/unsavedWarning';

export function useUnsavedWarning(dirty: boolean, message: string, busy: boolean) {
  const bypass = useRef(false);
  const current = useRef({ dirty, message, busy });
  current.current = { dirty, message, busy };
  const allowLeave = useCallback(() => { bypass.current = true; }, []);
  useEffect(() => {
    if (!dirty) return;
    return installUnsavedWarning(window, document, () => ({ ...current.current, bypass: bypass.current }), () => { bypass.current = true; });
  }, [dirty]);
  return allowLeave;
}
