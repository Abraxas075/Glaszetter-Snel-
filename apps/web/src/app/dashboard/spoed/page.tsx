'use client';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

type Status = 'open' | 'in_progress' | 'resolved';
interface Alert { id: string; revision: string; title: string; description: string; address: string; phone: string; status: Status; createdAt: string; updatedAt: string; }
const labels: Record<Status, string> = { open: 'Nieuw', in_progress: 'In behandeling', resolved: 'Afgerond' };
export default function EmergencyAlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<Status>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', address: '', phone: '' });
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setAlerts(await apiRequest<Alert[]>('/emergency-alerts')); }
    catch { setError('Spoedmeldingen laden is mislukt. Probeer opnieuw.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try {
      const saved = await apiRequest<Alert>('/emergency-alerts', { method: 'POST', body: JSON.stringify(draft) });
      setAlerts(current => [saved, ...current]); setDraft({ title: '', description: '', address: '', phone: '' }); setShowForm(false); setFilter('open');
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Opslaan mislukt. Je invoer blijft staan.'); }
    finally { setSaving(false); }
  }
  async function change(alert: Alert, status: Status) {
    if (changing) return;
    setChanging(alert.id); setError('');
    try {
      const saved = await apiRequest<Alert>(`/emergency-alerts/${alert.id}`, { method: 'PATCH', body: JSON.stringify({ status, revision: alert.revision }) });
      setAlerts(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Status wijzigen is mislukt.'); }
    finally { setChanging(null); }
  }
  if (user?.role === 'external') return <><h1 className="sapphire-title">Spoedmeldingen</h1><p>Dit overzicht is beschikbaar voor medewerkers.</p></>;
  return <section>
    <div className="urgent-heading"><div><h1 className="sapphire-title">Spoedmeldingen</h1><p>Meldingen registreren en de afhandeling volgen.</p></div><button className="sapphire-button urgent-button" type="button" onClick={() => setShowForm(true)}>＋ Nieuwe spoedmelding</button></div>
    <div className="urgent-filters" role="group" aria-label="Statusfilter">
      {(Object.keys(labels) as Status[]).map(status => <button key={status} type="button" className="glass-panel urgent-filter" aria-pressed={filter === status} onClick={() => setFilter(status)}>{labels[status]} <strong>{loading || error ? '—' : alerts.filter(a => a.status === status).length}</strong></button>)}
    </div>
    {showForm && <form className="glass-panel urgent-frame urgent-form" onSubmit={submit}>
      <h2>Nieuwe spoedmelding</h2><fieldset disabled={saving}>
        <label>Titel<input required maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label>Omschrijving<textarea rows={3} maxLength={2000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
        <label>Adres<input maxLength={300} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} /></label>
        <label>Telefoonnummer<input type="tel" maxLength={60} value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></label>
        <div className="urgent-actions"><button className="sapphire-button urgent-button" type="submit">{saving ? 'Opslaan…' : 'Melding opslaan'}</button><button className="sapphire-button sapphire-button-secondary" type="button" onClick={() => setShowForm(false)}>Sluiten</button></div>
      </fieldset>
    </form>}
    {error && <div role="alert" className="urgent-error">{error} <button type="button" className="sapphire-button sapphire-button-secondary" onClick={() => void load()}>Overzicht vernieuwen</button></div>}
    {loading && <p role="status">Spoedmeldingen laden…</p>}
    {!loading && !error && alerts.filter(a => a.status === filter).length === 0 && <div className="glass-panel urgent-frame urgent-card"><h2>Geen meldingen met status ‘{labels[filter]}’</h2><p>Nieuwe spoedmeldingen verschijnen hier na het opslaan.</p></div>}
    {!loading && alerts.filter(a => a.status === filter).map(alert => <article key={alert.id} className="glass-panel urgent-frame urgent-card">
      <div className="urgent-card-heading"><h2>{alert.title}</h2><span>{labels[alert.status]}</span></div>
      <time dateTime={alert.createdAt}>{new Date(alert.createdAt).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</time>
      {alert.description && <p className="urgent-description">{alert.description}</p>}
      {alert.address && <p>{alert.address}</p>}
      <div className="urgent-actions">
        {alert.phone && alert.phone.replace(/[^+0-9]/g, '') && <a className="sapphire-button sapphire-button-secondary" href={`tel:${alert.phone.replace(/[^+0-9]/g, '')}`}>Bellen</a>}
        {alert.address && <a className="sapphire-button sapphire-button-secondary" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(alert.address)}`}>Route</a>}
        {alert.status === 'open' && <button disabled={!!changing} className="sapphire-button urgent-button" type="button" onClick={() => void change(alert, 'in_progress')}>In behandeling nemen</button>}
        {alert.status === 'in_progress' && <button disabled={!!changing} className="sapphire-button urgent-button" type="button" onClick={() => void change(alert, 'resolved')}>Afronden</button>}
        {alert.status !== 'open' && <button disabled={!!changing} className="sapphire-button sapphire-button-secondary" type="button" onClick={() => void change(alert, 'open')}>Heropenen</button>}
      </div>
    </article>)}
  </section>;
}
