import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { loadOrderJobs, ORDER_JOB_LABELS, type Job, type OrderJobStatus, type PaginatedResponse } from '@glaszetter/shared';
import { OrderPdfButton } from '../components/OrderPdfButton';
import { OrderDetails } from '../components/OrderDetails';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../api/client';
import { SapphireScreen, sapphireStyles as s } from '../components/SapphireScreen';
import { GlassPanel } from '../components/GlassPanel';
import { sapphire } from '../constants/sapphire';
export function OrdersScreen() {
  const { token, user, isLoading } = useAuth(); const router = useRouter(); const navigation = useNavigation();
  const [editorVersion, setEditorVersion] = useState(0);
  const edits = useRef(new Map<string, { dirty: boolean; busy: boolean }>());
  const onEditingChange = useCallback((id: string, dirty: boolean, busy: boolean) => {
    if (dirty || busy) edits.current.set(id, { dirty, busy }); else edits.current.delete(id);
  }, []);
  const confirmLeave = useCallback((action: () => void) => {
    if ([...edits.current.values()].some(value => value.busy)) { Alert.alert("Opslaan bezig", "Wacht tot het opslaan is afgerond."); return; }
    if (!edits.current.size) { action(); return; }
    Alert.alert("Niet opgeslagen", "Je leverancier of leverdatum is nog niet opgeslagen. Wil je je wijzigingen weggooien?", [{ text: "Verder invullen", style: "cancel" }, { text: "Weggooien", style: "destructive", onPress: () => { edits.current.clear(); setEditorVersion(value => value + 1); action(); } }]);
  }, []);
  useEffect(() => navigation.addListener("beforeRemove", event => {
    if (!edits.current.size) return;
    event.preventDefault(); confirmLeave(() => navigation.dispatch(event.data.action));
  }), [navigation, confirmLeave]);
  const [jobs, setJobs] = useState<Job[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | OrderJobStatus>('all');
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!token) return;
    setLoading(true); setError('');
    loadOrderJobs(page => apiRequest<PaginatedResponse<Job>>(`/jobs?limit=100&page=${page}`, { token }))
      .then(value => { if (active) setJobs(value); })
      .catch(() => { if (active) setError('Bestellingen laden is mislukt. Probeer opnieuw.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, reload]));
  if (isLoading) return <SapphireScreen><ActivityIndicator color={sapphire.blue} /></SapphireScreen>;
  if (!user) return <Redirect href="/login" />;
  const visible = jobs.filter(job => filter === 'all' || job.status === filter);
  return <SapphireScreen title="Bestellingen">
    <Text style={s.muted}>Bestelde klussen en verwachte leveringen. Open een klus om de gegevens te bekijken.</Text>
    <View style={{ gap: 8, marginVertical: 12 }}>{(['all','ordered','delivery_expected'] as const).map(status => <Pressable key={status} accessibilityRole="button" accessibilityState={{selected:filter===status}} style={[s.action,{backgroundColor:filter===status?sapphire.blue:sapphire.glass}]} onPress={() => confirmLeave(() => setFilter(status))}><Text style={s.actionText}>{status==='all'?'Alle':ORDER_JOB_LABELS[status]} ({loading||error?'—':jobs.filter(job => status==='all'||job.status===status).length})</Text></Pressable>)}</View>
    {loading && <ActivityIndicator color={sapphire.blue} />}
    {!!error && <Text accessibilityRole="alert" style={s.text}>{error}</Text>}
    {!loading && !error && !visible.length && <GlassPanel style={s.card}><Text style={s.title}>Geen bestellingen in dit overzicht</Text><Text style={s.muted}>Klussen met de status Besteld of Levering verwacht verschijnen hier.</Text><Pressable accessibilityRole="button" style={s.action} onPress={() => router.push('/jobs')}><Text style={s.actionText}>Klussen openen</Text></Pressable></GlassPanel>}
    {!loading && !error && visible.map(job => <GlassPanel key={job.id} style={s.card}><Text style={s.title}>{job.name}</Text><Text style={s.muted}>{ORDER_JOB_LABELS[job.status as OrderJobStatus]}</Text>{!!job.notes && <Text style={s.text}>{job.notes}</Text>}<OrderDetails key={`${job.id}-${editorVersion}`} job={job} token={token!} onEditingChange={onEditingChange} onSaved={saved => setJobs(current => current.map(value => value.id === saved.id ? saved : value))} /><OrderPdfButton jobId={job.id} token={token!} canExport={() => !edits.current.has(job.id)} onBusy={onEditingChange} /><Pressable accessibilityRole="button" style={s.action} onPress={() => confirmLeave(() => router.push({pathname:'/jobs/[jobId]/elements',params:{jobId:job.id}}))}><Text style={s.actionText}>Klus openen</Text></Pressable></GlassPanel>)}
    <Pressable accessibilityRole="button" disabled={loading} style={s.action} onPress={() => confirmLeave(() => setReload(value => value+1))}><Text style={s.actionText}>Vernieuwen</Text></Pressable>
  </SapphireScreen>;
}
