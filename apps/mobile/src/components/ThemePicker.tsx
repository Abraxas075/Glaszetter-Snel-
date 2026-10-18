import { Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { GlassPanel } from './GlassPanel';
import { useSapphireStyles } from './SapphireScreen';
import { useAppTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/sapphire';

export function ThemePicker() {
  const { theme, palette, saving, error, setTheme } = useAppTheme();
  const s = useSapphireStyles();
  return (
    <GlassPanel style={s.card}>
      <Text style={s.title}>Thema</Text>
      <Text style={s.muted}>
        Kies de uitstraling van je app. Je keuze wordt op dit apparaat bewaard.
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Thema"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}
      >
        {(
          [
            { value: 'dark', label: 'Donker Saffier', icon: 'moon' },
            { value: 'light', label: 'Licht', icon: 'sun' },
          ] as const
        ).map((option) => {
          const selected = theme === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, disabled: saving }}
              disabled={saving}
              onPress={() => void setTheme(option.value as AppTheme)}
              style={{
                flex: 1,
                flexBasis: 130,
                minHeight: 50,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: selected ? palette.blue : palette.inner,
                backgroundColor: selected ? palette.selected : palette.glass,
              }}
            >
              <Feather name={option.icon} size={19} color={palette.blue} />
              <Text style={[s.text, { fontSize: 14, flexShrink: 1 }]}>{option.label}</Text>
              {selected && <Feather name="check" size={17} color={palette.link} />}
            </Pressable>
          );
        })}
      </View>
      {saving && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          Thema bewaren…
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={[s.text, { color: palette.error }]}>
          {error}
        </Text>
      )}
    </GlassPanel>
  );
}
