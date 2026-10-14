'use client';
import { useEffect, useRef, useState } from 'react';
import { createDutchSpeech, type RecognitionConstructor, type SpeechState } from '../lib/dutchSpeech';
export function useDutchSpeech() {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<SpeechState>({ isListening: false, transcript: '', error: '' });
  const controller = useRef<ReturnType<typeof createDutchSpeech> | null>(null);
  useEffect(() => {
    const browser = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor || !window.isSecureContext) return;
    setSupported(true);
    const instance = createDutchSpeech(Constructor, setState); controller.current = instance;
    return () => { instance.dispose(); controller.current = null; };
  }, []);
  return { ...state, supported, start: () => controller.current?.start(), stop: () => controller.current?.stop(), reset: () => controller.current?.reset() };
}
