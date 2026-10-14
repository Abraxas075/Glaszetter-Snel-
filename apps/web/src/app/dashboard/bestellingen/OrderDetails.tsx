'use client';
import { useEffect, useState } from 'react';
import { formatDeliveryDate, normalizeOrderDetails, type Job } from '@glaszetter/shared';
import { updateJob } from '../../../lib/jobs';
import { useUnsavedWarning } from '../../../hooks/useUnsavedWarning';

export function OrderDetails({ job, onSaved, onEditingChange }: { job: Job; onSaved: (job: Job) => void; onEditingChange: (id: string, dirty: boolean, busy: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState(job.orderNumber ?? '');
  const [supplier, setSupplier] = useState(job.supplierName ?? '');
  const [date, setDate] = useState(job.deliveryDate ?? '');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const dirty = editing && (number !== (job.orderNumber ?? '') || supplier !== (job.supplierName ?? '') || date !== (job.deliveryDate ?? ''));
  useEffect(() => { onEditingChange(job.id, dirty, busy); }, [job.id, dirty, busy, onEditingChange]);
  useEffect(() => () => onEditingChange(job.id, false, false), [job.id, onEditingChange]);
  useUnsavedWarning(dirty, 'Je bestelgegevens zijn nog niet opgeslagen. Wil je dit scherm verlaten?', busy);
  useEffect(() => { if (!editing) { setNumber(job.orderNumber ?? ''); setSupplier(job.supplierName ?? ''); setDate(job.deliveryDate ?? ''); } }, [job.orderNumber, job.supplierName, job.deliveryDate, editing]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const details = normalizeOrderDetails({ orderNumber: number, supplierName: supplier, deliveryDate: date });
      const saved = await updateJob(job.id, details);
      // An older server ignores new fields; never report a false successful save.
      if ((saved.orderNumber ?? null) !== details.orderNumber || (saved.supplierName ?? null) !== details.supplierName || (saved.deliveryDate ?? null) !== details.deliveryDate) throw new Error('De server heeft de bestelgegevens nog niet opgeslagen. Probeer opnieuw zodra de update klaar is.');
      onSaved(saved); setEditing(false); setMessage('Bestelgegevens opgeslagen.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Opslaan is mislukt. Je invoer blijft staan.'); }
    finally { setBusy(false); }
  }
  function cancel() {
    if (dirty && !window.confirm('Je wijzigingen zijn nog niet opgeslagen. Wil je ze weggooien?')) return;
    setEditing(false); setError('');
  }
  return <div className="urgent-form">
    {editing ? <form onSubmit={save}>
      <fieldset disabled={busy}><legend>Bestelgegevens wijzigen</legend>
        <label htmlFor={`number-${job.id}`}>Bestelnummer<input id={`number-${job.id}`} value={number} maxLength={60} onChange={e => setNumber(e.target.value)} placeholder="Bijvoorbeeld GS-2026-001" /></label>
        <label htmlFor={`supplier-${job.id}`}>Leverancier<input id={`supplier-${job.id}`} value={supplier} maxLength={200} onChange={e => setSupplier(e.target.value)} placeholder="Naam leverancier" /></label>
        <label htmlFor={`delivery-${job.id}`}>Verwachte leverdatum<input id={`delivery-${job.id}`} type="date" min="0001-01-01" max="9999-12-31" value={date} onChange={e => setDate(e.target.value)} /></label>
        <p>Laat een veld leeg om de opgeslagen waarde te verwijderen.</p>
        <div className="urgent-actions"><button type="submit" className="sapphire-button">{busy ? 'Opslaan…' : 'Opslaan'}</button><button type="button" className="sapphire-button sapphire-button-secondary" onClick={cancel}>Annuleren</button></div>
      </fieldset>
    </form> : <><p><strong>Bestelnummer:</strong> {job.orderNumber || 'Nog niet ingevuld'}</p><p><strong>Leverancier:</strong> {job.supplierName || 'Nog niet ingevuld'}</p><p><strong>Verwachte leverdatum:</strong> {formatDeliveryDate(job.deliveryDate)}</p><button type="button" className="sapphire-button sapphire-button-secondary" onClick={() => { setEditing(true); setMessage(''); }}>Bestelgegevens wijzigen</button></>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </div>;
}
