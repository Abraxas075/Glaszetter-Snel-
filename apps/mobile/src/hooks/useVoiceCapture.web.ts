// Web fallback: expo-speech-recognition is a native module and its web
// build crashes on import (module-level `class extends <undefined>`).
// Metro picks this .web.ts file automatically for web bundles, so the
// rest of the screen (manual entry) keeps working - only voice capture
// itself is unavailable here.
export const useVoiceCapture = () => {
  return {
    isListening: false,
    transcript: '',
    error: 'Spraak-inmeten is niet beschikbaar in de webbrowser. Gebruik de mobiele app.',
    start: () => {},
    stop: () => {},
    reset: () => {},
  };
};
