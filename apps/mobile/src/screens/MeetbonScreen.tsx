import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View, Switch } from 'react-native';
import { emptyMeetbon, isMeetbon, MEETBON_SECTIONS, type Meetbon } from '@glaszetter/shared';
import { apiRequest } from '../api/client';
import { shareMeetbonPdf } from '../api/meetbonPdf';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
export function MeetbonScreen({ jobId }: { jobId: string }) {
  const { token } = useAuth();
  const [data, setData] = useState<Meetbon>(emptyMeetbon);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true; setLoaded(false);
    apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { token }).then(d => { if (active) { setData(d); setLoaded(true); } }).catch(() => { if (active) setMessage('Laden mislukt. Open de meetbon opnieuw.'); });
    return () => { active = false; };
  }, [jobId, token]);
  async function save() {
    if (!loaded || busy) return;
    if (!isMeetbon(data)) { setMessage('Vul per ruit een positief aantal, breedte en hoogte in.'); return; }
    setBusy(true); setMessage('');
    try { await apiRequest(`/jobs/${jobId}/meetbon`, { token, method: 'PUT', body: JSON.stringify(data) }); setMessage('Meetbon opgeslagen.'); }
    catch { setMessage('Opslaan mislukt. Je invoer blijft staan.'); }
    finally { setBusy(false); }
  }
  async function exportPdf() {
    if (!loaded || busy || !token) return;
    if (!isMeetbon(data)) { setMessage('Vul per ruit een positief aantal, breedte en hoogte in.'); return; }
    setBusy(true); setExporting(true); setMessage('');
    let saved = false;
    try {
      await apiRequest(`/jobs/${jobId}/meetbon`, { token, method: 'PUT', body: JSON.stringify(data) });
      saved = true;
      await shareMeetbonPdf(jobId, token);
      setMessage('Meetbon opgeslagen. PDF geopend om op te slaan of te delen.');
    } catch (err) {
      setMessage(saved ? `Meetbon opgeslagen. ${err instanceof Error ? err.message : 'PDF delen is mislukt. Probeer opnieuw.'}` : 'Opslaan mislukt. Je invoer blijft staan.');
    } finally { setBusy(false); setExporting(false); }
  }
  return <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Digitale meetbon</Text>
    <Text>Alle glasmaten in mm. Ruiten in de bon staan los van ingemeten elementen.</Text>
    <Text accessibilityLiveRegion="polite">{message || (!loaded ? 'Laden…' : '')}</Text>
    <View pointerEvents={!loaded || busy ? 'none' : 'auto'}>
      {MEETBON_SECTIONS.map(s => <View key={s.title} style={{ borderWidth: 1, borderColor: '#1d4ed8', padding: 12, marginBottom: 16, borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{s.title}</Text>
        {s.fields.map(f => <View key={f.key}><Text>{f.label}</Text><TextInput accessibilityLabel={f.label} maxLength={2000} editable={loaded && !busy} style={{ borderBottomWidth: 1, padding: 10 }} value={data.fields[f.key] ?? ''} onChangeText={v => setData({ ...data, fields: { ...data.fields, [f.key]: v } })} /></View>)}
        {s.checks.map(c => <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text>{c.label}</Text><Switch accessibilityLabel={c.label} disabled={!loaded || busy} value={data.checks[c.key] ?? false} onValueChange={v => setData({ ...data, checks: { ...data.checks, [c.key]: v } })} /></View>)}
        {s.title === 'Extra werkzaamheden' && <Text>Bij schilderwerk: voeg foto’s toe bij de klus.</Text>}
      </View>)}
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Ruiten</Text>
      {data.lines.map((l, i) => <View key={i} style={{ padding: 12, borderWidth: 1, marginVertical: 8 }}>
        {(['quantity', 'width', 'height', 'glassType', 'notes'] as const).map(k => <View key={k}><Text>{({ quantity: 'Aantal', width: 'Breedte (mm)', height: 'Hoogte (mm)', glassType: 'Soort glas', notes: 'Opmerking' })[k]}</Text><TextInput editable={loaded && !busy} style={{ padding: 10, borderBottomWidth: 1 }} keyboardType={k === 'glassType' || k === 'notes' ? 'default' : 'numeric'} value={String(l[k] || '')} onChangeText={v => setData({ ...data, lines: data.lines.map((x, j) => i === j ? { ...x, [k]: k === 'glassType' || k === 'notes' ? v : Number(v.replace(',', '.')) } : x) })} /></View>)}
        <Button label="Ruit verwijderen" onPress={() => setData({ ...data, lines: data.lines.filter((_, j) => i !== j) })} />
      </View>)}
      <Button label="＋ Ruit toevoegen" disabled={!loaded || busy || data.lines.length >= 200} onPress={() => setData({ ...data, lines: [...data.lines, { quantity: 1, width: 0, height: 0, glassType: '', notes: '' }] })} />
      <Text>Totaal: {data.lines.reduce((n, l) => n + l.quantity * l.width * l.height / 1e6, 0).toLocaleString('nl-NL', { maximumFractionDigits: 3 })} m²</Text>
    </View>
    <Button label={busy && !exporting ? 'Opslaan…' : 'Meetbon opslaan'} disabled={!loaded || busy} onPress={save} />
    <Button label={exporting ? 'PDF maken…' : 'Opslaan en PDF delen'} disabled={!loaded || busy} onPress={exportPdf} />
    <Text>De PDF bevat de ingevulde meetbon en beschikbare klus- en elementfoto’s. Niet ingesloten foto’s worden vermeld.</Text>
  </ScrollView>;
}
