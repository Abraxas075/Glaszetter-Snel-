import { useCallback, useEffect, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

interface VoiceCaptureState {
  isListening: boolean;
  transcript: string;
  error: string | null;
}

// Wraps expo-speech-recognition's event-based API in a small hook with
// simple state. Native module - requires a custom dev client build,
// not available in Expo Go or the web bundler.
export const useVoiceCapture = () => {
  const [state, setState] = useState<VoiceCaptureState>({
    isListening: false,
    transcript: '',
    error: null,
  });

  useSpeechRecognitionEvent('start', () => {
    setState((prev) => ({ ...prev, isListening: true, error: null }));
  });

  useSpeechRecognitionEvent('end', () => {
    setState((prev) => ({ ...prev, isListening: false }));
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setState((prev) => ({ ...prev, transcript: text }));
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState((prev) => ({
      ...prev,
      isListening: false,
      error: event.message ?? 'Spraakherkenning mislukt',
    }));
  });

  const start = useCallback(async () => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setState((prev) => ({ ...prev, error: 'Microfoon-toestemming geweigerd' }));
      return;
    }

    setState({ isListening: false, transcript: '', error: null });
    ExpoSpeechRecognitionModule.start({
      lang: 'nl-NL',
      interimResults: true,
      continuous: false,
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const reset = useCallback(() => {
    setState({ isListening: false, transcript: '', error: null });
  }, []);

  useEffect(() => stop, [stop]);

  return { ...state, start, stop, reset };
};
