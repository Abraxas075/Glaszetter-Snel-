import { JobMapsActions } from '../components/GoogleMapsActions';
import { meetbonMapLocation } from '../utils/googleMaps';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View, Switch, Pressable, StyleSheet, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GlassPanel } from '../components/GlassPanel';
import { MeetbonSpeechInput } from '../components/MeetbonSpeechInput';
import { GlassTypeSelect } from '../components/GlassTypeSelect';
import { useSapphire, useThemedStyles } from '../contexts/ThemeContext';
import type { SapphirePalette } from '../constants/sapphire';
import { hasMeetbonChanges, compareMeetbons, resolveMeetbonComparison, type MeetbonComparison, emptyMeetbon, isMeetbon, getGlassThicknessOptions, MEETBON_SECTIONS, type Meetbon } from '@glaszetter/shared';
import { ApiError, apiRequest } from '../api/client';
import { shareMeetbonPdf } from '../api/meetbonPdf';
import { useAuth } from '../contexts/AuthContext';

export function MeetbonScreen({ jobId }: { jobId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const palette = useSapphire();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Klantgegevens: true });
  const [showHelp, setShowHelp] = useState(false);
  function toggleSection(title: string) {
    setExpanded(current => ({ ...current, [title]: !current[title] }));
  }
  function Action({ label, onPress, secondary = false, danger = false, disabled = false }: {
    label: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean;
  }) {
    return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={[styles.action, secondary && styles.secondaryAction, danger && styles.dangerAction, disabled && styles.disabled]}>
      <Text style={[styles.actionText, secondary && styles.secondaryActionText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>;
  }

  const [data, setData] = useState<Meetbon>(emptyMeetbon);
  const [savedData, setSavedData] = useState<Meetbon>(emptyMeetbon);
  const [comparison, setComparison] = useState<MeetbonComparison | null>(null);
  const [choices, setChoices] = useState<Record<string, 'own' | 'latest'>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const hasUnsavedChanges = loaded && hasMeetbonChanges(data, savedData);
  function updateData(next: Meetbon) {
    setMessage('');
    setData(next);
  }
  useEffect(() => {
    let active = true; setLoaded(false); setComparison(null); setChoices({}); setMessage('');
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
    try { const savedBon = await apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { token, method: 'PUT', body: JSON.stringify(data) }); setSavedData(savedBon); setData(savedBon); setMessage('Meetbon online opgeslagen bij deze klus.'); }
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
  const locked = !loaded || busy || !!comparison;
  const total = data.lines.reduce((n, line) => n + line.quantity * line.width * line.height / 1e6, 0);
  const status = !loaded ? 'Meetbon laden…' : hasUnsavedChanges ? 'Niet-opgeslagen wijzigingen' : savedData.revision ? 'Online opgeslagen' : 'Nieuwe meetbon';
  const ruitenPanel = <GlassPanel key="ruiten">
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: !!expanded.Ruiten }} onPress={() => toggleSection('Ruiten')} style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={24} color={palette.blue} />
            <View style={styles.headerText}><Text style={styles.sectionTitle}>Ruiten</Text><Text style={styles.hint}>{data.lines.length} {data.lines.length === 1 ? 'ruit' : 'ruiten'} · {total.toLocaleString('nl-NL', { maximumFractionDigits: 3 })} m²</Text></View>
            <Ionicons name={expanded.Ruiten ? 'chevron-up' : 'chevron-down'} size={20} color={palette.blue} />
          </Pressable>
          {!!expanded.Ruiten && <View style={styles.sectionBody}>
            {data.lines.length === 0 && <Text style={styles.hint}>Voeg een ruit toe om de afmetingen en het soort glas vast te leggen.</Text>}
            {data.lines.map((line, index) => <View key={index} style={styles.ruit}>
              <Text style={styles.sectionTitle}>Ruit {index + 1}</Text>
              {(['quantity', 'width', 'height', 'glassType', 'glassThickness', 'notes'] as const).map(key => <View key={key} style={styles.field}>
                <Text style={styles.label}>{({ quantity: 'Aantal', width: 'Breedte (mm)', height: 'Hoogte (mm)', glassType: 'Soort glas', glassThickness: 'Glasdikte / opbouw', notes: 'Opmerking' })[key]}</Text>
                {key === 'glassType' ? <GlassTypeSelect label={`Ruit ${index + 1}: Soort glas`} value={line.glassType} disabled={locked} onChange={value => updateData({ ...data, lines: data.lines.map((x, i) => index === i ? { ...x, glassType: value } : x) })} /> : key === 'glassThickness' ? <GlassTypeSelect key={line.glassType} label={`Ruit ${index + 1}: Glasdikte / opbouw`} value={line.glassThickness ?? ''} options={getGlassThicknessOptions(line.glassType)} placeholder="Kies dikte / opbouw" customPlaceholder="Eigen dikte of opbouw" disabled={locked} onChange={value => updateData({ ...data, lines: data.lines.map((x, i) => index === i ? { ...x, glassThickness: value } : x) })} /> : <MeetbonSpeechInput accessibilityLabel={`Ruit ${index + 1}: ${({ quantity: 'Aantal', width: 'Breedte (mm)', height: 'Hoogte (mm)', glassType: 'Soort glas', glassThickness: 'Glasdikte / opbouw', notes: 'Opmerking' })[key]}`} voiceKind={key === 'quantity' ? 'quantity' : key === 'width' || key === 'height' ? 'dimension' : 'text'} maxLength={key === 'notes' ? 2000 : undefined} editable={!locked} style={styles.input} selectionColor={palette.blue} keyboardType={key === 'notes' ? 'default' : 'numeric'} value={String(line[key] || '')} onChangeText={v => updateData({ ...data, lines: data.lines.map((x, i) => index === i ? { ...x, [key]: key === 'notes' ? v : Number(v.replace(',', '.')) } : x) })} />}
              </View>)}
              <Action danger secondary label="Ruit verwijderen" disabled={locked} onPress={() => updateData({ ...data, lines: data.lines.filter((_, i) => index !== i) })} />
            </View>)}
            <Action secondary label="＋ Ruit toevoegen" disabled={locked || data.lines.length >= 200} onPress={() => updateData({ ...data, lines: [...data.lines, { quantity: 1, width: 0, height: 0, glassType: '', notes: '' }] })} />
          </View>}
        </GlassPanel>;
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Terug naar elementen" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={palette.blue} />
        </Pressable>
        <View style={styles.headerText}><Text accessibilityRole="header" style={styles.title}>Digitale meetbon</Text><Text style={styles.hint}>Inmeten · maten in mm</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Uitleg over de meetbon" accessibilityState={{ expanded: showHelp }} onPress={() => setShowHelp(v => !v)} style={styles.iconButton}>
          <Ionicons name="information-circle-outline" size={24} color={palette.blue} />
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text>
        {!!message && <Text style={styles.notice} accessibilityLiveRegion="polite">{message}</Text>}
        {showHelp && <GlassPanel style={styles.panelContent}>
          <Text style={styles.text}>Opslaan bewaart deze bon online bij de klus. Met PDF delen sla je een bestand op je telefoon op of stuur je het door.</Text>
          <Text style={styles.hint}>Ruiten in deze bon staan los van ingemeten elementen. De PDF bevat ook beschikbare klus- en elementfoto’s; ontbrekende foto’s worden vermeld.</Text>
          <Text style={styles.hint}>Sla wijzigingen op voordat je dit scherm verlaat.</Text>
        </GlassPanel>}
        {comparison && <GlassPanel style={styles.panelContent}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Wijzigingen vergelijken</Text>
          <Text style={styles.text}>Je invoer blijft bewaard. Niet-overlappende wijzigingen worden samengevoegd. Kies bij gewijzigde ruiten de volledige lijst.</Text>
          {comparison.conflicts.map(c => <View key={c.key} style={styles.conflict}>
            <Text style={styles.label}>{c.label}</Text><Text style={styles.text}>Eigen invoer: {JSON.stringify(c.own)}</Text><Text style={styles.text}>Nieuwste bon: {JSON.stringify(c.latest)}</Text>
            <Action secondary label={choices[c.key] === 'own' ? '✓ Eigen invoer' : 'Eigen invoer behouden'} onPress={() => setChoices({ ...choices, [c.key]: 'own' })} />
            <Action secondary label={choices[c.key] === 'latest' ? '✓ Nieuwste bon' : 'Nieuwste invoer behouden'} onPress={() => setChoices({ ...choices, [c.key]: 'latest' })} />
          </View>)}
          <Action label="Verschillen verwerken" onPress={applyComparison} />
        </GlassPanel>}
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" onPress={() => setExpanded(Object.fromEntries([...MEETBON_SECTIONS.map(s => [s.title, true]), ['Ruiten', true]]))} style={styles.toolbarButton}><Text style={styles.link}>Alles openen</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setExpanded({})} style={styles.toolbarButton}><Text style={styles.link}>Alles sluiten</Text></Pressable>
        </View>
        {MEETBON_SECTIONS.flatMap((section, index) => {
          const filled = section.fields.filter(f => !!data.fields[f.key]?.trim()).length + section.checks.filter(c => data.checks[c.key]).length;
          const open = !!expanded[section.title];
          return [<GlassPanel key={section.title}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${section.title}, ${filled} ingevuld`} accessibilityState={{ expanded: open }} onPress={() => toggleSection(section.title)} style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.headerText}><Text style={styles.sectionTitle}>{section.title}</Text>{filled > 0 && <Text style={styles.hint}>{filled} ingevuld</Text>}</View>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={palette.blue} />
            </Pressable>
            {open && <View style={styles.sectionBody}>
              {section.title === 'Klantgegevens' && loaded && <><JobMapsActions dark jobId={jobId} override={meetbonMapLocation(data.fields)} /><Text style={styles.hint}>Route via dit adres, of het klusadres als dit leeg is.</Text></>}
              {section.fields.map(f => <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <MeetbonSpeechInput accessibilityLabel={f.label} maxLength={2000} editable={!locked} placeholderTextColor={palette.muted} selectionColor={palette.blue} style={styles.input}
                  keyboardType={f.key === 'email' ? 'email-address' : f.key === 'phone' ? 'phone-pad' : 'default'}
                  autoCapitalize={f.key === 'email' ? 'none' : 'sentences'}
                  value={data.fields[f.key] ?? ''} onChangeText={v => updateData({ ...data, fields: { ...data.fields, [f.key]: v } })} />
              </View>)}
              {section.checks.map(c => <View key={c.key} style={styles.checkRow}>
                <Text style={styles.checkLabel}>{c.label}</Text>
                <Switch accessibilityLabel={c.label} disabled={locked} trackColor={{ false: palette.inner, true: palette.blue }} value={data.checks[c.key] ?? false} onValueChange={v => updateData({ ...data, checks: { ...data.checks, [c.key]: v } })} />
              </View>)}
              {section.title === 'Extra werkzaamheden' && <Text style={styles.hint}>Bij schilderwerk: voeg foto’s toe bij de klus.</Text>}
            </View>}
          </GlassPanel>, section.title === 'Klantgegevens' ? ruitenPanel : null];
        })}

        <View style={styles.deleteArea}><Action danger secondary label="Meetbon verwijderen" disabled={locked} onPress={confirmRemove} /></View>
      </ScrollView>
      <View style={styles.footer}>
        <Action label={busy && !exporting ? 'Opslaan…' : 'Meetbon opslaan'} disabled={locked} onPress={save} />
        <Action secondary label={exporting ? 'PDF maken…' : 'Opslaan en PDF delen'} disabled={locked} onPress={exportPdf} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const createStyles = (p: SapphirePalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: p.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: p.inner },
  headerText: { flex: 1, gap: 2 },
  title: { color: p.text, fontSize: 20, fontWeight: '600' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 12, gap: 8, paddingBottom: 16 },
  text: { color: p.text, fontSize: 15, lineHeight: 22 },
  hint: { color: p.muted, fontSize: 13, lineHeight: 19 },
  status: { color: p.muted, fontSize: 14 },
  notice: { color: p.text, backgroundColor: p.selected, padding: 14, fontSize: 15, lineHeight: 22 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  toolbarButton: { minHeight: 44, justifyContent: 'center' },
  link: { color: p.link, fontSize: 14, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 10 },
  sectionNumber: { color: p.link, fontSize: 16, fontWeight: '600', minWidth: 25 },
  sectionTitle: { color: p.text, fontSize: 16, fontWeight: '600' },
  sectionBody: { borderTopWidth: 1, borderColor: p.inner, padding: 12, gap: 8 },
  panelContent: { padding: 12, gap: 8 },
  field: { gap: 4 },
  label: { color: p.text, fontSize: 14, fontWeight: '500' },
  input: { color: p.text, backgroundColor: p.background, borderColor: p.inner, borderWidth: 1, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderColor: p.inner },
  checkLabel: { flex: 1, color: p.text, fontSize: 15 },
  ruit: { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderColor: p.inner },
  conflict: { gap: 10 },
  action: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: p.blue, borderWidth: 1, borderColor: p.blue },
  actionText: { color: p.onPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  secondaryAction: { backgroundColor: p.glass, borderColor: p.inner },
  secondaryActionText: { color: p.text },
  dangerAction: { borderColor: p.error },
  dangerText: { color: p.error },
  disabled: { opacity: 0.5 },
  deleteArea: { paddingTop: 12 },
  footer: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderTopWidth: 1, borderColor: p.inner, backgroundColor: p.background },
});
