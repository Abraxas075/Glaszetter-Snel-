import { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { googleMapsLinks, type MapLocation } from '../utils/googleMaps';
import { useJobLocation } from '../hooks/useMapLocations';

interface Props {
  location?: MapLocation | null;
  loading?: boolean;
  error?: string;
  retry?: () => void;
  dark?: boolean;
}
export function GoogleMapsActions({ location, loading, error, retry, dark = false }: Props) {
  const [opening, setOpening] = useState(false);
  const links = googleMapsLinks(location);
  const textColor = dark ? '#B9CEDF' : '#475467';
  const action = {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: dark ? '#16ABDB' : '#0B6EF3',
  };
  const actionText = { color: dark ? '#51C8F1' : '#085FCC', fontWeight: '600' as const };
  async function open(url: string) {
    if (opening) return;
    setOpening(true);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Google Maps niet geopend',
        'Controleer je internetverbinding en probeer opnieuw. Installeer Google Maps of gebruik een browser.'
      );
    } finally {
      setOpening(false);
    }
  }
  return (
    <View style={{ gap: 8, marginVertical: 8 }}>
      {loading ? (
        <Text style={{ color: textColor }} accessibilityLiveRegion="polite">
          Adres laden…
        </Text>
      ) : error ? (
        <>
          <Text style={{ color: textColor }} accessibilityRole="alert">
            {error}
          </Text>
          {retry && (
            <Pressable accessibilityRole="button" style={action} onPress={retry}>
              <Text style={actionText}>Adres opnieuw laden</Text>
            </Pressable>
          )}
        </>
      ) : !links ? (
        <Text style={{ color: textColor }}>
          Geen bruikbaar straatadres ingevuld voor Google Maps.
        </Text>
      ) : (
        <>
          <Text style={{ color: textColor }}>{links.destination}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['map', 'route'] as const).map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="link"
                accessibilityLabel={`${kind === 'map' ? 'Google Maps' : 'Route starten'}: ${links.destination}`}
                accessibilityState={{ disabled: opening }}
                disabled={opening}
                style={[action, { opacity: opening ? 0.5 : 1 }]}
                onPress={() => void open(links[kind])}
              >
                <Text style={actionText}>{kind === 'map' ? 'Google Maps' : 'Route starten'}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
export function JobMapsActions({
  jobId,
  override,
  dark,
}: {
  jobId: string;
  override?: MapLocation;
  dark?: boolean;
}) {
  const state = useJobLocation(jobId, !override);
  return (
    <GoogleMapsActions
      location={override ?? state.data}
      loading={!override && state.loading}
      error={override ? undefined : state.error}
      retry={state.retry}
      dark={dark}
    />
  );
}
