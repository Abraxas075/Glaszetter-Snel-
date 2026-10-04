import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, View, Switch } from 'react-native';
import { compareMeetbons, resolveMeetbonComparison, type MeetbonComparison, emptyMeetbon, isMeetbon, MEETBON_SECTIONS, type Meetbon } from '@glaszetter/shared';
import { ApiError, apiRequest } from '../api/client';
import { shareMeetbonPdf } from '../api/meetbonPdf';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
export function MeetbonScreen({ jobId }: { jobId: string }) {
  const { token } = useAuth();
  const [data, setData] = useState<Meetbon>(emptyMeetbon);
  const [savedData, setSavedData] = useState<Meetbon>(emptyMeetbon);
  const [comparison, setComparison] = useState<MeetbonComparison | null>(null);
  const [choices, setChoices] = useState<Record<string, 'own' | 'latest'>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true; setLoaded(false); setComparison(null); setChoices({});
    apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { token }).then(d => { if (active) { setData(d); setSavedData(d); setLoaded(true); } }).catch(() => { if (active) setMessage('Laden mislukt. Open de meetbon opnieuw.'); });
    return () => { active = false; };
  }, [jobId, token]);
  async function handleConflict(err: unknown): Promise<boolean> {
    if (!(err instanceof ApiError) || err.code !== 'MEETBON_CHANGED') return false;
    try {
      const latest = await apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { token });
      setComparison(compareMeetbons(savedData, data, latest)); setChoices({});
      setMessage('De bon is gewijzigd. Je eigen invoer blijft bewaard. Vergelijk de verschillen hieronder.');
    } catch { setMessage('De bon is gewijzigd. Vergelijken kon niet worden geladen. Je invoer blijft staan; probeer opslaan opnieuw.'); }
    return true;
  }
  function applyComparison() {
    if (!comparison) return;
    try { setData(resolveMeetbonComparison(comparison, choices)); setSavedData(comparison.latest); setComparison(null); setMessage('Verschillen verwerkt. Controleer de bon en sla opnieuw op.'); }
    catch (err) { setMessage((err as Error).message); }
  }
  async function save() {
    if (!loaded || busy || !!comparison) return;
    if (!isMeetbon(data)) { setMessage('Controleer aantallen, maten en teksten (maximaal 2000 tekens per tekstveld).'); return; }
    setBusy(true); setMessage('');
    try { const savedBon = await apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { token, method: 'PUT', body: JSON.stringify(data) }); setSavedData(savedBon); setData(savedBon); setMessage('Meetbon opgeslagen.'); }
    catch (err) { if (await handleConflict(err)) return; setMessage(err instanceof ApiError && err.status === 413 ? 'De meetbon is te groot (maximaal 8 MiB). Je invoer blijft staan.' : 'Opslaan mislukt. Je invoer blijft staan.'); }
    finally { setBusy(false); }
  }
  async function exportPdf() {
    if (!loaded || busy || !!comparison || !token) return;
    if (!isMeetbon(data)) { setMessage('Controleer aantallen, maten en teksten (maximaal 2000 tekens per tekstveld).'); return; }
    setBusy(true); setExporting(true); setMessage('');
    let saved = false;
    try {
      const savedBon = await apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { token, method: 'PUT', body: JSON.stringify(data) });
      setSavedData(savedBon); setData(savedBon);
      saved = true;
      await shareMeetbonPdf(jobId, token);
      setMessage('Meetbon opgeslagen. PDF geopend om op te slaan of te delen.');
    } catch (err) {
      if (await handleConflict(err)) return;
      setMessage(!saved && err instanceof ApiError && err.status === 413 ? 'De meetbon is te groot (maximaal 8 MiB). Je invoer blijft staan.' : saved ? `Meetbon opgeslagen. ${err instanceof Error ? err.message : 'PDF delen is mislukt. Probeer opnieuw.'}` : 'Opslaan mislukt. Je invoer blijft staan.');
    } finally { setBusy(false); setExporting(false); }
  }
  async function removeBon() {
    if (!loaded || busy || !!comparison) return;
    setBusy(true); setMessage('');
    try {
      await apiRequest(`/jobs/${jobId}/meetbon`, { token, method: 'DELETE', body: JSON.stringify(savedData) });
      const empty = { ...emptyMeetbon(), revision: null }; setData(empty); setSavedData(empty);
      setMessage('Meetbon verwijderd. Klus, inmetingen en foto’s zijn behouden.');
    } catch (err) {
      if (await handleConflict(err)) return;
      setMessage(err instanceof ApiError && err.code === 'MEETBON_CHANGED' ? err.message : 'Verwijderen mislukt. Je invoer blijft staan.');
    } finally { setBusy(false); }
  }
  function confirmRemove() {
    if (!loaded || busy || !!comparison) return;
    if (Platform.OS === 'web') {
      if (window.confirm('Meetbon verwijderen? De opgeslagen meetbon en niet-opgeslagen invoer worden verwijderd. Klus, inmetingen en foto’s blijven behouden.')) void removeBon();
      return;
    }
    Alert.alert('Meetbon verwijderen?', 'De opgeslagen meetbon en niet-opgeslagen invoer in dit scherm worden verwijderd. Klus, inmetingen en foto’s blijven behouden.', [{ text: 'Annuleren', style: 'cancel' }, { text: 'Verwijderen', style: 'destructive', onPress: () => { void removeBon(); } }]);
  }
  return <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Digitale meetbon</Text>
    <Text>Alle glasmaten in mm. Ruiten in de bon staan los van ingemeten elementen.</Text>
    <Text accessibilityLiveRegion="polite">{message || (!loaded ? 'Laden…' : '')}</Text>
    {comparison && <View style={{ padding: 12, borderWidth: 2, borderColor: '#1d4ed8', gap: 8 }}>
      <Text style={{ fontSize: 20 }}>Wijzigingen vergelijken</Text>
      <Text>Niet-overlappende wijzigingen worden samengevoegd. Bij gelijktijdig gewijzigde ruiten kies je de volledige lijst.</Text>
      {comparison.conflicts.map(c => <View key={c.key}>
        <Text>{c.label}</Text><Text>Eigen invoer: {JSON.stringify(c.own)}</Text><Text>Nieuwste bon: {JSON.stringify(c.latest)}</Text>
        <Button label={choices[c.key] === 'own' ? '✓ Eigen invoer' : 'Eigen invoer behouden'} onPress={() => setChoices({ ...choices, [c.key]: 'own' })} />
        <Button label={choices[c.key] === 'latest' ? '✓ Nieuwste bon' : 'Nieuwste invoer behouden'} onPress={() => setChoices({ ...choices, [c.key]: 'latest' })} />
      </View>)}
      <Button label="Verschillen verwerken" onPress={applyComparison} />
    </View>}
    <View pointerEvents={!loaded || busy || !!comparison ? 'none' : 'auto'}>
      {MEETBON_SECTIONS.map(s => <View key={s.title} style={{ borderWidth: 1, borderColor: '#1d4ed8', padding: 12, marginBottom: 16, borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{s.title}</Text>
        {s.fields.map(f => <View key={f.key}><Text>{f.label}</Text><TextInput accessibilityLabel={f.label} maxLength={2000} editable={loaded && !busy} style={{ borderBottomWidth: 1, padding: 10 }} value={data.fields[f.key] ?? ''} onChangeText={v => setData({ ...data, fields: { ...data.fields, [f.key]: v } })} /></View>)}
        {s.checks.map(c => <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text>{c.label}</Text><Switch accessibilityLabel={c.label} disabled={!loaded || busy || !!comparison} value={data.checks[c.key] ?? false} onValueChange={v => setData({ ...data, checks: { ...data.checks, [c.key]: v } })} /></View>)}
        {s.title === 'Extra werkzaamheden' && <Text>Bij schilderwerk: voeg foto’s toe bij de klus.</Text>}
      </View>)}
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Ruiten</Text>
      {data.lines.map((l, i) => <View key={i} style={{ padding: 12, borderWidth: 1, marginVertical: 8 }}>
        {(['quantity', 'width', 'height', 'glassType', 'notes'] as const).map(k => <View key={k}><Text>{({ quantity: 'Aantal', width: 'Breedte (mm)', height: 'Hoogte (mm)', glassType: 'Soort glas', notes: 'Opmerking' })[k]}</Text><TextInput maxLength={k === 'glassType' || k === 'notes' ? 2000 : undefined} editable={loaded && !busy} style={{ padding: 10, borderBottomWidth: 1 }} keyboardType={k === 'glassType' || k === 'notes' ? 'default' : 'numeric'} value={String(l[k] || '')} onChangeText={v => setData({ ...data, lines: data.lines.map((x, j) => i === j ? { ...x, [k]: k === 'glassType' || k === 'notes' ? v : Number(v.replace(',', '.')) } : x) })} /></View>)}
        <Button label="Ruit verwijderen" onPress={() => setData({ ...data, lines: data.lines.filter((_, j) => i !== j) })} />
      </View>)}
      <Button label="＋ Ruit toevoegen" disabled={!loaded || busy || !!comparison || data.lines.length >= 200} onPress={() => setData({ ...data, lines: [...data.lines, { quantity: 1, width: 0, height: 0, glassType: '', notes: '' }] })} />
      <Text>Totaal: {data.lines.reduce((n, l) => n + l.quantity * l.width * l.height / 1e6, 0).toLocaleString('nl-NL', { maximumFractionDigits: 3 })} m²</Text>
    </View>
    <Button label={busy && !exporting ? 'Opslaan…' : 'Meetbon opslaan'} disabled={!loaded || busy || !!comparison} onPress={save} />
    <Button label={exporting ? 'PDF maken…' : 'Opslaan en PDF delen'} disabled={!loaded || busy || !!comparison} onPress={exportPdf} />
    <Button label="Meetbon verwijderen" disabled={!loaded || busy || !!comparison} onPress={confirmRemove} />
    <Text>De PDF bevat de ingevulde meetbon en beschikbare klus- en elementfoto’s. Niet ingesloten foto’s worden vermeld.</Text>
  </ScrollView>;
}
