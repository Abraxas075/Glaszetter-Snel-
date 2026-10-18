import { GoogleMapsActions } from './GoogleMapsActions';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supplierLinks, type Supplier } from '@glaszetter/shared';
import { apiRequest } from '../api/client';
import { useSapphireStyles } from './SapphireScreen';
import { GlassPanel } from './GlassPanel';
import { useSapphire } from '../contexts/ThemeContext';

export function useSuppliers(token: string | null) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setSuppliers([]);
    if (!token) { setLoading(false); setError(''); return; }
    setLoading(true); setError('');
    apiRequest<Supplier[]>('/suppliers', {token})
      .then(data => { if (active) setSuppliers(data); })
      .catch(() => { if (active) setError('Leveranciers laden is mislukt. Je kunt de leveranciersnaam wel zelf invullen.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, reload]));
  return {suppliers, loading, error, load: () => setReload(value => value + 1)};
}
async function open(url: string) {
  try { await Linking.openURL(url); }
  catch { Alert.alert('Niet geopend', 'Er is geen geschikte app beschikbaar om dit te openen.'); }
}
export function SupplierDirectory({suppliers, loading, error, load}: ReturnType<typeof useSuppliers>) {
  const sapphire = useSapphire();
  const s = useSapphireStyles();

  const [expanded, setExpanded] = useState(false);
  return <GlassPanel style={s.card}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} style={s.action} onPress={() => setExpanded(value => !value)}><Text style={s.actionText}>Glasleveranciers ({loading ? '…' : suppliers.length}) — {expanded ? 'sluiten' : 'contactgegevens bekijken'}</Text></Pressable>
    {!!error && <><Text accessibilityRole="alert" style={s.text}>{error}</Text><Pressable accessibilityRole="button" disabled={loading} style={s.action} onPress={load}><Text style={s.actionText}>Opnieuw laden</Text></Pressable></>}
    {expanded && <View style={{gap:12}}>
      {loading && <ActivityIndicator color={sapphire.blue} />}
      {!loading && !error && !suppliers.length && <Text style={s.muted}>Er zijn nog geen vaste leveranciers toegevoegd.</Text>}
      {suppliers.map(supplier => {
        const links = supplierLinks(supplier);
        return <View key={supplier.id} style={{gap:6,marginTop:12}}>
          <Text style={s.title}>{supplier.name}</Text>
          <GoogleMapsActions location={supplier} dark />
          {!!supplier.contactPerson && <Text style={s.muted}>{supplier.contactPerson}</Text>}
          {!!supplier.phone && <Text style={s.text}>{supplier.phone}</Text>}
          {!!supplier.email && <Text style={s.text}>{supplier.email}</Text>}
          {(['phone','email','website'] as const).map(kind => links[kind] ? <Pressable key={kind} accessibilityRole="link" accessibilityLabel={`${kind === 'phone' ? 'Bel' : kind === 'email' ? 'E-mail' : 'Website'} ${supplier.name}`} style={s.action} onPress={() => void open(links[kind]!)}><Text style={s.actionText}>{kind === 'phone' ? 'Bellen' : kind === 'email' ? 'E-mail' : 'Website'}</Text></Pressable> : null)}
        </View>;
      })}
    </View>}
  </GlassPanel>;
}
