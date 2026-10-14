'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { loadOrderJobs, ORDER_JOB_LABELS, type Job, type OrderJobStatus, type PaginatedResponse } from '@glaszetter/shared';
import { OrderPdfButton } from './OrderPdfButton';
import { OrderDetails } from './OrderDetails';
import { apiRequest } from '../../../lib/api';
export default function OrdersPage() {
  const [editorVersion, setEditorVersion] = useState(0);
  const edits = useRef(new Map<string, { dirty: boolean; busy: boolean }>());
  const onEditingChange = useCallback((id: string, dirty: boolean, busy: boolean) => {
    if (dirty || busy) edits.current.set(id, { dirty, busy }); else edits.current.delete(id);
  }, []);
  function confirmLeave(action: () => void) {
    if ([...edits.current.values()].some(value => value.busy)) { window.alert('Wacht tot het opslaan is afgerond.'); return; }
    if (edits.current.size && !window.confirm('Je leverancier of leverdatum is nog niet opgeslagen. Wil je je wijzigingen weggooien?')) return;
    if (edits.current.size) { edits.current.clear(); setEditorVersion(value => value + 1); }
    action();
  }
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | OrderJobStatus>('all');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setJobs(await loadOrderJobs(page => apiRequest<PaginatedResponse<Job>>(`/jobs?limit=100&page=${page}`))); }
    catch { setError('Bestellingen laden is mislukt. Probeer opnieuw.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = jobs.filter(job => filter === 'all' || job.status === filter);
  return <section>
    <div className="urgent-heading"><div><h1 className="sapphire-title">Bestellingen</h1><p>Bestelde klussen en verwachte leveringen. Open een klus om de gegevens te bekijken.</p></div><button type="button" className="sapphire-button sapphire-button-secondary" disabled={loading} onClick={() => confirmLeave(() => void load())}>Vernieuwen</button></div>
    <div className="urgent-filters" role="group" aria-label="Bestellingstatus">
      {(['all','ordered','delivery_expected'] as const).map(status => <button key={status} type="button" className="glass-panel urgent-filter" aria-pressed={filter === status} onClick={() => confirmLeave(() => setFilter(status))}>{status === 'all' ? 'Alle' : ORDER_JOB_LABELS[status]} <strong>{loading || error ? '—' : jobs.filter(job => status === 'all' || job.status === status).length}</strong></button>)}
    </div>
    {loading && <p role="status">Bestellingen laden…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !visible.length && <div className="glass-panel urgent-card"><h2>Geen bestellingen in dit overzicht</h2><p>Klussen met de status Besteld of Levering verwacht verschijnen hier.</p><Link href="/dashboard/jobs" className="sapphire-button sapphire-button-secondary">Klussen openen</Link></div>}
    {!loading && !error && visible.map(job => <article key={job.id} className="glass-panel urgent-card">
      <div className="urgent-card-heading"><h2>{job.name}</h2><span>{ORDER_JOB_LABELS[job.status as OrderJobStatus]}</span></div>
      {job.notes && <p className="urgent-description">{job.notes}</p>}
      <OrderDetails key={`${job.id}-${editorVersion}`} job={job} onEditingChange={onEditingChange} onSaved={saved => setJobs(current => current.map(value => value.id === saved.id ? saved : value))} />
      <OrderPdfButton jobId={job.id} canExport={() => !edits.current.has(job.id)} />
      <Link className="sapphire-button" href={`/dashboard/jobs/${job.id}` as Route}>Klus openen</Link>
    </article>)}
  </section>;
}
