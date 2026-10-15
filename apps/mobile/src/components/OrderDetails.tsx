import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { formatDeliveryDate, normalizeOrderDetails, parseDutchDeliveryDate, type Job, type Supplier } from '@glaszetter/shared';
import { apiRequest } from '../api/client';
import { sapphireStyles as s } from './SapphireScreen';
import { sapphire } from '../constants/sapphire';

export function OrderDetails({ job, token, suppliers = [], onSaved, onEditingChange }: { job: Job; token: string; suppliers?: Supplier[]; onSaved: (job: Job) => void; onEditingChange: (id: string, dirty: boolean, busy: boolean) => void }) {
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false);
  const [number, setNumber] = useState(job.orderNumber ?? '');
  const [supplier, setSupplier] = useState(job.supplierName ?? '');
  const [date, setDate] = useState(job.deliveryDate ? formatDeliveryDate(job.deliveryDate) : '');
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const dirty = editing && (number !== (job.orderNumber ?? '') || supplier !== (job.supplierName ?? '') || date !== (job.deliveryDate ? formatDeliveryDate(job.deliveryDate) : ''));
  useEffect(() => { onEditingChange(job.id, dirty, busy); }, [job.id, dirty, busy, onEditingChange]);
  useEffect(() => () => onEditingChange(job.id, false, false), [job.id, onEditingChange]);
  useEffect(() => { if (!editing) { setNumber(job.orderNumber ?? ''); setSupplier(job.supplierName ?? ''); setDate(job.deliveryDate ? formatDeliveryDate(job.deliveryDate) : ''); } }, [job.orderNumber, job.supplierName, job.deliveryDate, editing]);
  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      const details = normalizeOrderDetails({ orderNumber: number, supplierName: supplier, deliveryDate: parseDutchDeliveryDate(date) });
      const saved = await apiRequest<Job>(`/jobs/${job.id}`, { token, method: 'PATCH', body: JSON.stringify(details) });
      if ((details.orderNumber !== null ? (saved.orderNumber ?? null) !== details.orderNumber : !saved.orderNumber) || (saved.supplierName ?? null) !== details.supplierName || (saved.deliveryDate ?? null) !== details.deliveryDate) throw new Error('De server heeft de bestelgegevens nog niet opgeslagen. Probeer opnieuw zodra de update klaar is.');
      onSaved(saved); setEditing(false); setMessage('Bestelgegevens opgeslagen.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Opslaan is mislukt. Je invoer blijft staan.'); }
    finally { setBusy(false); }
  }
  function cancel() {
    if (!dirty) { setEditing(false); setError(''); return; }
    Alert.alert('Niet opgeslagen', 'Wil je je wijzigingen weggooien?', [{ text: 'Verder invullen', style: 'cancel' }, { text: 'Weggooien', style: 'destructive', onPress: () => { setEditing(false); setError(''); } }]);
  }
  const input = { borderWidth: 1, borderColor: sapphire.edge, color: sapphire.text, backgroundColor: sapphire.glass, padding: 12, minHeight: 48, fontSize: 16 };
  return <View style={{ gap: 8 }}>
    {editing ? <>
      <Text style={s.text}>Bestelnummer</Text><TextInput accessibilityLabel="Bestelnummer" style={input} value={number} maxLength={60} editable={!busy} onChangeText={setNumber} placeholder="Automatisch bij opslaan" placeholderTextColor={sapphire.muted} autoCorrect={false} autoCapitalize="characters" />
      <Text style={s.text}>Leverancier</Text><TextInput accessibilityLabel="Leverancier" style={input} value={supplier} maxLength={200} editable={!busy} onChangeText={setSupplier} placeholder="Naam leverancier" placeholderTextColor={sapphire.muted} />
      {suppliers.map(value => <Pressable key={value.id} accessibilityRole="button" accessibilityState={{selected:supplier === value.name}} disabled={busy} style={s.action} onPress={() => setSupplier(value.name)}><Text style={s.actionText}>{supplier === value.name ? '✓ ' : ''}{value.name}</Text></Pressable>)}
      <Text style={s.text}>Verwachte leverdatum (DD-MM-JJJJ)</Text><TextInput accessibilityLabel="Verwachte leverdatum" style={input} value={date} maxLength={10} editable={!busy} onChangeText={setDate} placeholder="Bijvoorbeeld 21-10-2026" placeholderTextColor={sapphire.muted} autoCorrect={false} />
      <Text style={s.muted}>Laat het bestelnummer leeg om automatisch te nummeren. Een bestaand nummer blijft behouden. Leverancier en leverdatum kun je leegmaken.</Text>
      <Pressable accessibilityRole="button" disabled={busy} style={s.action} onPress={() => void save()}><Text style={s.actionText}>{busy ? 'Opslaan…' : 'Opslaan'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} style={s.action} onPress={cancel}><Text style={s.actionText}>Annuleren</Text></Pressable>
    </> : <><Text style={s.text}>Bestelnummer: {job.orderNumber || 'Nog niet ingevuld'}</Text><Text style={s.text}>Leverancier: {job.supplierName || 'Nog niet ingevuld'}</Text><Text style={s.text}>Verwachte leverdatum: {formatDeliveryDate(job.deliveryDate)}</Text><Pressable accessibilityRole="button" style={s.action} onPress={() => { setEditing(true); setMessage(''); }}><Text style={s.actionText}>Bestelgegevens wijzigen</Text></Pressable></>}
    {!!error && <Text accessibilityRole="alert" style={s.text}>{error}</Text>}{!!message && <Text accessibilityLiveRegion="polite" style={s.muted}>{message}</Text>}
  </View>;
}
