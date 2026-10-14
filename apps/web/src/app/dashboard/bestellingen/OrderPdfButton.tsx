'use client';
import { useState } from 'react';
import { ApiError, fetchBlob } from '../../../lib/api';
export function OrderPdfButton({ jobId, canExport }: { jobId: string; canExport: () => boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function download() {
    if (!canExport()) { setMessage('Sla eerst je bestelgegevens op. De bestelbon gebruikt de opgeslagen gegevens.'); return; }
    setBusy(true); setMessage('');
    try {
      const blob = await fetchBlob(`/jobs/${encodeURIComponent(jobId)}/order/pdf`);
      if (!blob.type.includes('application/pdf')) throw new Error('De server heeft geen PDF teruggegeven. Probeer opnieuw.');
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'Bestelbon.pdf'; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000); setMessage('PDF-download gestart met de opgeslagen meetbon en levergegevens.');
    } catch (error) {
      setMessage(error instanceof ApiError && error.status === 422 ? 'Sla eerst een meetbon met ruiten op bij deze klus.' : error instanceof Error ? error.message : 'Bestelbon downloaden is mislukt.');
    } finally { setBusy(false); }
  }
  return <div style={{ marginTop: 12 }}><button type="button" className="sapphire-button sapphire-button-secondary" disabled={busy} onClick={() => void download()}>{busy ? 'Bestelbon maken…' : 'PDF-bestelbon'}</button><p>Gebruikt de ruiten en levergegevens die je hebt opgeslagen.</p>{message && <p role="status">{message}</p>}</div>;
}
