import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeetbonSpeechInput } from './MeetbonSpeechInput';
import { useSapphire, useThemedStyles } from '../contexts/ThemeContext';
import type { SapphirePalette } from '../constants/sapphire';

export const GLASS_TYPE_OPTIONS = [
  'Enkelglas', 'Dubbelglas', 'HR-glas', 'HR+-glas', 'HR++',
  'Triple glas (HR+++)', 'Vacuümglas', 'Gelaagd glas', 'Gehard glas', 'Draadglas', 'Figuurglas',
] as const;
export function GlassTypeSelect({ value, onChange, disabled = false, label, options = GLASS_TYPE_OPTIONS, placeholder = 'Kies soort glas', customPlaceholder = 'Bijv. HR++ 4-16-4 of gelaagd 33.1' }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; label: string;
  options?: readonly string[]; placeholder?: string; customPlaceholder?: string;
}) {
  const palette = useSapphire();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(() => !!value && !options.includes(value));
  // Existing specifications, including thickness/build-up, remain editable verbatim.
  useEffect(() => { if (value && !options.includes(value)) setCustom(true); }, [value, options]);
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      style={[styles.trigger, disabled && styles.disabled]} onPress={() => setOpen(current => !current)}>
      <Text style={[styles.text, !value && styles.placeholder]}>{custom ? 'Anders / zelf invullen' : value || placeholder}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={palette.blue} />
    </Pressable>
    {open && <View style={styles.options}>
      {['', ...options, '__custom__'].map(option => {
        const selected = option === '__custom__' ? custom : !custom && value === option;
        const optionLabel = option === '__custom__' ? 'Anders / zelf invullen' : option || 'Geen keuze';
        return <Pressable key={option} accessibilityRole="radio" accessibilityLabel={optionLabel} accessibilityState={{ checked: selected, disabled }} disabled={disabled}
          style={[styles.option, selected && styles.selected]} onPress={() => {
            setCustom(option === '__custom__'); setOpen(false);
            if (option !== '__custom__') onChange(option);
          }}>
          <Text style={styles.text}>{optionLabel}</Text>
          {selected && <Ionicons name="checkmark" size={20} color={palette.blue} />}
        </Pressable>;
      })}
    </View>}
    {custom && <MeetbonSpeechInput accessibilityLabel={`${label}: eigen specificatie`} value={value} editable={!disabled} maxLength={2000}
      placeholder={customPlaceholder} placeholderTextColor={palette.muted} selectionColor={palette.blue}
      style={styles.customInput} onChangeText={onChange} />}
  </View>;
}

const createStyles = (p: SapphirePalette) => StyleSheet.create({
  container: { gap: 6 },
  trigger: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: p.inner, backgroundColor: p.background },
  text: { flex: 1, color: p.text, fontSize: 16 },
  placeholder: { color: p.muted },
  options: { borderWidth: 1, borderColor: p.inner, backgroundColor: p.background },
  option: { minHeight: 44, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderColor: p.inner },
  selected: { backgroundColor: p.selected },
  customInput: { color: p.text, backgroundColor: p.background, borderColor: p.inner, borderWidth: 1, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16 },
  disabled: { opacity: 0.5 },
});
