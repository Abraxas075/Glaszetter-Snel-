import React, { useCallback, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../contexts/AuthContext';
import { todayJobCount } from '../api/dashboard';
import { SapphireScreen } from '../components/SapphireScreen';
import { GlassPanel } from '../components/GlassPanel';
import { MenuIcon, type MenuIconName } from '../components/MenuIcon';
import { sapphire } from '../constants/sapphire';
const actions: {
  label: string;
  path: '/spoed' | '/jobs' | '/kaart' | '/agenda' | '/chat' | '/customers';
  icon: MenuIconName;
  urgent?: boolean;
}[] = [
  { label: 'Inmeten', path: '/jobs', icon: 'measure' },
  { label: 'Kaart', path: '/kaart', icon: 'map' },
  { label: 'Agenda', path: '/agenda', icon: 'calendar' },
  { label: 'Chat', path: '/chat', icon: 'message-square' },
  { label: 'Klantgegevens', path: '/customers', icon: 'users' },
  { label: 'Spoedmeldingen', path: '/spoed', icon: 'clipboard', urgent: true },
];
export const HomeScreen: React.FC = () => {
  const { token } = useAuth();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setCount(null);
      setError(false);
      if (token)
        todayJobCount(token)
          .then((value) => {
            if (active) setCount(value);
          })
          .catch(() => {
            if (active) setError(true);
          });
      return () => {
        active = false;
      };
    }, [token, reload])
  );
  return (
    <SapphireScreen centerContent>
      <View style={styles.logoPlate}>
        <Image
          source={require('../../assets/glaszetter-snel-logo-panel.png')}
          accessibilityLabel="Glaszetter Snel"
          resizeMode="contain"
          style={styles.logo}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={error ? 'Klussen opnieuw laden' : 'Vandaag: open de agenda'}
        onPress={() => (error ? setReload((value) => value + 1) : router.push('/agenda'))}
      >
        <GlassPanel style={[styles.row, styles.dayCard]}>
          <View style={styles.icon}>
            <MenuIcon name="clipboard" size={34} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.today}>Vandaag</Text>
            {error ? (
              <Text style={styles.error}>Laden mislukt. Tik om opnieuw te proberen.</Text>
            ) : count === null ? (
              <ActivityIndicator color={sapphire.blue} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Text style={styles.count}>
                {count} {count === 1 ? 'klus' : 'klussen'}
              </Text>
            )}
          </View>
          <Feather name="chevron-right" size={26} color={sapphire.blue} />
        </GlassPanel>
      </Pressable>
      {actions.map((action) => (
        <Pressable
          key={action.path}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => router.push(action.path)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <GlassPanel tone={action.urgent ? 'urgent' : 'default'} style={styles.row}>
            <View style={styles.icon}>
              {action.urgent ? <Feather name="alert-triangle" size={28} color={sapphire.red}/> : <MenuIcon name={action.icon} size={28} />}
            </View>
            <Text style={[styles.copy, styles.label]}>{action.label}</Text>
            <Feather name="chevron-right" size={24} color={action.urgent ? sapphire.red : sapphire.blue} />
          </GlassPanel>
        </Pressable>
      ))}
    </SapphireScreen>
  );
};
const styles = StyleSheet.create({
  logoPlate: { width: '100%', alignSelf: 'center', aspectRatio: 3.08, marginBottom: 12, overflow: 'hidden' },
  logo: { position: 'absolute', width: '110.2%', height: '130.8%', left: '-5.1%', top: '-16.1%' },
  row: {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCard: { minHeight: 76, marginBottom: 12 },
  icon: { width: 58, borderRightWidth: 1, borderRightColor: sapphire.edge, marginRight: 16 },
  copy: { flex: 1 },
  label: { color: sapphire.text, fontSize: 19, fontWeight: '600' },
  today: { color: sapphire.muted, fontSize: 16, marginBottom: 4 },
  count: { color: sapphire.text, fontSize: 26, fontWeight: '700' },
  error: { color: sapphire.muted, fontSize: 14 },
});
