import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { ElementType } from '@glaszetter/shared';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { ApiError } from '../api/client';
import { createElementWithMeasurement, suggestNextCode } from '../api/elements';
import { parseVoiceTranscript } from '../api/measurements';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { ELEMENT_TYPE_LABELS, ELEMENT_TYPES } from '../constants/elementTypes';
import { colors, spacing, radius } from '../constants/colors';

interface NewMeasurementScreenProps {
  jobId: string;
}

type Tab = 'manual' | 'voice';

export const NewMeasurementScreen: React.FC<NewMeasurementScreenProps> = ({ jobId }) => {
  const router = useRouter();
  const { token } = useAuth();
  const voice = useVoiceCapture();

  const [tab, setTab] = useState<Tab>('manual');
  const [code, setCode] = useState('');
  const [type, setType] = useState<ElementType | null>(null);
  const [location, setLocation] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [glassType, setGlassType] = useState('');
  const [notes, setNotes] = useState('');

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestCode = async (prefix: string) => {
    if (!token) return;
    try {
      const { code: suggested } = await suggestNextCode(token, jobId, prefix);
      setCode(suggested);
    } catch {
      setError('Kon geen code suggereren.');
    }
  };

  const handleProcessTranscript = async () => {
    if (!token || !voice.transcript) return;
    setError(null);
    setIsParsing(true);
    try {
      const parsed = await parseVoiceTranscript(token, voice.transcript);
      if (parsed.elementCode) setCode(parsed.elementCode);
      if (parsed.elementType) setType(parsed.elementType);
      if (parsed.location) setLocation(parsed.location);
      if (parsed.width !== null) setWidth(String(parsed.width));
      if (parsed.height !== null) setHeight(String(parsed.height));
      if (parsed.glassType) setGlassType(parsed.glassType);
      if (parsed.notes) setNotes(parsed.notes);
      setTab('manual');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verwerken van spraak is mislukt.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setError(null);

    const widthNum = parseFloat(width.replace(',', '.'));
    const heightNum = parseFloat(height.replace(',', '.'));

    if (!code.trim()) {
      setError('Elementcode is verplicht.');
      return;
    }
    if (!type) {
      setError('Kies een elementtype.');
      return;
    }
    if (isNaN(widthNum) || isNaN(heightNum)) {
      setError('Breedte en hoogte zijn verplicht.');
      return;
    }

    setIsSaving(true);
    try {
      await createElementWithMeasurement(token, {
        jobId,
        code: code.trim(),
        type,
        location: location.trim() || undefined,
        width: widthNum,
        height: heightNum,
        glassType: glassType.trim() || undefined,
        measurementNotes: notes.trim() || undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nieuw element inmeten</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'manual' && styles.tabActive]}
          onPress={() => setTab('manual')}
        >
          <Text style={[styles.tabLabel, tab === 'manual' && styles.tabLabelActive]}>
            Handmatig
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'voice' && styles.tabActive]}
          onPress={() => setTab('voice')}
        >
          <Text style={[styles.tabLabel, tab === 'voice' && styles.tabLabelActive]}>Spraak</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {tab === 'voice' && (
        <View style={styles.voicePanel}>
          <Text style={styles.hint}>
            Spreek de meting in, bijv. "R01 woonkamer, raam, 1230 breed, 1480 hoog, HR++ 4-16-4,
            sponning 18 millimeter, speling 8 millimeter, links draaikiep, rechts vast."
          </Text>

          <Button
            label={voice.isListening ? 'Stop opname' : 'Start opname'}
            variant={voice.isListening ? 'danger' : 'primary'}
            onPress={voice.isListening ? voice.stop : voice.start}
          />

          {voice.error && <Text style={styles.error}>{voice.error}</Text>}

          {voice.transcript !== '' && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>Transcript</Text>
              <Text style={styles.transcriptText}>{voice.transcript}</Text>
            </View>
          )}

          {voice.transcript !== '' && !voice.isListening && (
            <Button
              label={isParsing ? 'Verwerken...' : 'Verwerken naar velden'}
              onPress={handleProcessTranscript}
              disabled={isParsing}
              variant="secondary"
            />
          )}

          {isParsing && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
        </View>
      )}

      {tab === 'manual' && (
        <View style={styles.form}>
          <Text style={styles.label}>Elementcode</Text>
          <View style={styles.codeRow}>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={setCode}
              placeholder="R01"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.suggestButton} onPress={() => suggestCode('R')}>
              <Text style={styles.suggestButtonText}>R+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestButton} onPress={() => suggestCode('D')}>
              <Text style={styles.suggestButtonText}>D+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Elementtype</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {ELEMENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {ELEMENT_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Locatie</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Woonkamer"
          />

          <View style={styles.dimensionsRow}>
            <View style={styles.dimensionField}>
              <Text style={styles.label}>Breedte (mm)</Text>
              <TextInput
                style={styles.input}
                value={width}
                onChangeText={setWidth}
                placeholder="1230"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.dimensionField}>
              <Text style={styles.label}>Hoogte (mm)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="1480"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Glassoort</Text>
          <TextInput
            style={styles.input}
            value={glassType}
            onChangeText={setGlassType}
            placeholder="HR++ 4-16-4"
          />

          <Text style={styles.label}>Notities</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Sponning, speling, draairichting, overig..."
            multiline
          />

          <Button
            label={isSaving ? 'Opslaan...' : 'Opslaan'}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.background,
  },
  form: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeInput: {
    flex: 1,
  },
  suggestButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  suggestButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dimensionField: {
    flex: 1,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  voicePanel: {
    gap: spacing.md,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  transcriptBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  transcriptText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  spinner: {
    marginTop: spacing.sm,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
  },
});
