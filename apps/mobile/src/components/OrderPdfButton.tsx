import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { shareOrderPdf } from '../api/orderPdf';
import { sapphireStyles as s } from './SapphireScreen';
export function OrderPdfButton({ jobId, token, canExport, onBusy }: { jobId: string; token: string; canExport: () => boolean; onBusy: (id: string, dirty: boolean, busy: boolean) => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function download() {
    if (!canExport()) { setMessage('Sla eerst je wijzigingen aan leverancier en leverdatum op. De bestelbon gebruikt de opgeslagen gegevens.'); return; }
    setBusy(true); onBusy(`${jobId}:pdf`, false, true); setMessage('');
    try { await shareOrderPdf(jobId, token); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Bestelbon maken is mislukt.'); }
    finally { setBusy(false); onBusy(`${jobId}:pdf`, false, false); }
  }
  return <View style={{ gap: 8 }}><Pressable accessibilityRole="button" disabled={busy} style={s.action} onPress={() => void download()}><Text style={s.actionText}>{busy ? 'Bestelbon maken…' : 'PDF-bestelbon opslaan of delen'}</Text></Pressable><Text style={s.muted}>Gebruikt de ruiten en levergegevens die je hebt opgeslagen.</Text>{!!message && <Text accessibilityRole="alert" style={s.text}>{message}</Text>}</View>;
}
