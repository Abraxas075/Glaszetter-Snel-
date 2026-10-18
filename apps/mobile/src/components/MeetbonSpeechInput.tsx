import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { useSapphire, useThemedStyles } from '../contexts/ThemeContext';
import type { SapphirePalette } from '../constants/sapphire';
import { dictationValue, type DictationKind } from '../utils/meetbonDictation';

interface Props extends TextInputProps {
  accessibilityLabel: string;
  voiceKind?: DictationKind;
}

export function MeetbonSpeechInput({ voiceKind = 'text', ...props }: Props) {
  const [open, setOpen] = useState(false);
  const palette = useSapphire();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.row}>
    <TextInput {...props} style={[props.style, styles.inputFlex]} />
    <Pressable accessibilityRole="button" accessibilityLabel={`${props.accessibilityLabel} inspreken`} accessibilityState={{ disabled: props.editable === false }} disabled={props.editable === false}
      style={[styles.microphone, props.editable === false && styles.disabled]} onPress={() => setOpen(true)}>
      <Ionicons name="mic-outline" size={21} color={palette.blue} />
    </Pressable>
    {open && <DictationDialog label={props.accessibilityLabel} kind={voiceKind} onClose={() => setOpen(false)} onApply={value => {
      if (props.editable === false) return;
      props.onChangeText?.(value);
      setOpen(false);
    }} />}
  </View>;
}

export function DictationDialog({ label, kind, onClose, onApply }: { label: string; kind: DictationKind; onClose: () => void; onApply: (value: string) => void }) {
  const voice = useVoiceCapture();
  const palette = useSapphire();
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState('');
  const [edited, setEdited] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!edited) setDraft(voice.transcript); }, [voice.transcript, edited]);
  function close() { voice.stop(); onClose(); }
  async function start() {
    voice.reset(); setStarting(true); setDraft(''); setEdited(false); setError('');
    try { await voice.start(); }
    catch { setError('Spraakinvoer kon niet starten. Controleer de microfoontoestemming en probeer opnieuw.'); }
    finally { setStarting(false); }
  }
  function apply() {
    try { onApply(dictationValue(draft, kind)); }
    catch (err) { setError((err as Error).message); }
  }
  return <Modal visible animationType="slide" onRequestClose={close}>
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Inspreken</Text>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>{kind === 'text' ? 'Spreek de tekst voor dit veld in.' : 'Spreek alleen de waarde in. Glasmaten zijn in millimeters.'} Controleer het resultaat voordat je het gebruikt. Dit vervangt de huidige veldinhoud.</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: starting }} disabled={starting} style={[styles.primary, starting && styles.disabled]} onPress={voice.isListening ? voice.stop : () => { void start(); }}>
            <Text style={styles.primaryText}>{starting ? 'Microfoon starten…' : voice.isListening ? 'Stop inspreken' : draft ? 'Opnieuw inspreken' : 'Start inspreken'}</Text>
          </Pressable>
          <Text style={styles.hint} accessibilityLiveRegion="polite">{voice.isListening ? 'Microfoon aan · ik luister…' : 'Microfoon uit'}</Text>
          {!!(error || voice.error) && <Text accessibilityRole="alert" style={styles.error}>{error || voice.error}</Text>}
          <Text style={styles.label}>Herkende tekst</Text>
          <TextInput accessibilityLabel="Herkende tekst aanpassen" multiline maxLength={2000} editable={!starting && !voice.isListening} value={draft}
            style={styles.transcript} selectionColor={palette.blue} placeholder="Je gesproken tekst verschijnt hier" placeholderTextColor={palette.muted}
            onChangeText={text => { setEdited(true); setDraft(text); setError(''); }} />
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: starting || voice.isListening || !draft.trim() }} disabled={starting || voice.isListening || !draft.trim()}
            style={[styles.primary, (starting || voice.isListening || !draft.trim()) && styles.disabled]} onPress={apply}>
            <Text style={styles.primaryText}>{kind === 'text' ? 'Tekst gebruiken' : 'Waarde gebruiken'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={close}><Text style={styles.label}>Annuleren</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const createStyles = (p: SapphirePalette) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'stretch' },
  inputFlex: { flex: 1, minWidth: 0 },
  microphone: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: p.inner, backgroundColor: p.glass },
  screen: { flex: 1, backgroundColor: p.background },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '600', color: p.text },
  label: { fontSize: 16, color: p.text },
  hint: { fontSize: 14, lineHeight: 21, color: p.muted },
  error: { fontSize: 14, lineHeight: 21, color: p.error },
  transcript: { minHeight: 128, padding: 12, borderWidth: 1, borderColor: p.inner, color: p.text, backgroundColor: p.glass, fontSize: 16, textAlignVertical: 'top' },
  primary: { minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: p.blue },
  primaryText: { color: p.onPrimary, fontWeight: '600', fontSize: 15 },
  secondary: { minHeight: 44, padding: 12, borderWidth: 1, borderColor: p.inner, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
