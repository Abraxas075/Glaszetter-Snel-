export interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
export type RecognitionConstructor = new () => Recognition;
export interface SpeechState { isListening: boolean; transcript: string; error: string; }
const errors: Record<string, string> = {
  'not-allowed': 'Microfoontoegang is geweigerd. Controleer de browserinstellingen.',
  'service-not-allowed': 'Spraakherkenning is niet toegestaan in deze browser.',
  'audio-capture': 'Geen beschikbare microfoon gevonden.',
  'no-speech': 'Geen spraak gehoord. Probeer opnieuw.',
  'network': 'Spraakherkenning heeft geen verbinding. Controleer je internetverbinding.',
  'language-not-supported': 'Nederlandse spraakherkenning is niet beschikbaar in deze browser.',
};
export function createDutchSpeech(Constructor: RecognitionConstructor, changed: (state: SpeechState) => void) {
  let current: Recognition | null = null;
  let disposed = false;
  let state: SpeechState = { isListening: false, transcript: '', error: '' };
  const emit = (patch: Partial<SpeechState>) => { state = { ...state, ...patch }; if (!disposed) changed(state); };
  const detach = (recognition: Recognition) => { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; };
  return {
    start() {
      if (disposed || current) return;
      try {
        const recognition = new Constructor(); current = recognition;
        recognition.lang = 'nl-NL'; recognition.interimResults = true; recognition.continuous = false; recognition.maxAlternatives = 1;
        recognition.onresult = event => {
          if (current !== recognition) return;
          emit({ transcript: Array.from(event.results, result => result[0]?.transcript ?? '').join(' ').trim() });
        };
        recognition.onerror = event => {
          if (current !== recognition) return;
          detach(recognition); current = null;
          emit({ isListening: false, error: errors[event.error] ?? 'Spraakherkenning is mislukt. Probeer opnieuw.' });
          try { recognition.abort(); } catch { /* already stopped */ }
        };
        recognition.onend = () => { if (current === recognition) { detach(recognition); current = null; emit({ isListening: false }); } };
        emit({ isListening: true, transcript: '', error: '' }); recognition.start();
      } catch {
        if (current) { const failed = current; detach(failed); current = null; try { failed.abort(); } catch { /* start failed */ } }
        emit({ isListening: false, error: 'Spraakinvoer kon niet starten. Controleer je microfoon en probeer opnieuw.' });
      }
    },
    stop() { try { current?.stop(); } catch { emit({ error: 'Stoppen is mislukt. Sluit het formulier om de opname te beëindigen.' }); } },
    reset() { if (!current) emit({ transcript: '', error: '' }); },
    dispose() { disposed = true; if (current) { const recognition = current; current = null; detach(recognition); try { recognition.abort(); } catch { /* already stopped */ } } },
  };
}
export function appendSpeech(description: string, transcript: string): string | null {
  const combined = [description.trim(), transcript.trim()].filter(Boolean).join('\n');
  return combined.length <= 2000 ? combined : null;
}
