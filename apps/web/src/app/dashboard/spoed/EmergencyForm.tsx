'use client';
import { useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../../lib/api';
import type { Alert } from './page';
import { useUnsavedWarning } from '../../../hooks/useUnsavedWarning';

type Draft = { title: string; description: string; address: string; phone: string; assignedUserId: string | null };
type SelectedPhoto = { id: string; file: File; url: string };
const empty = (): Draft => ({ title: '', description: '', address: '', phone: '', assignedUserId: null });
export function EmergencyForm({ members, onSaved, onClose }: {
  members: { id: string; name: string }[]; onSaved: (alert: Alert) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(empty);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [saved, setSaved] = useState<Alert | null>(null);
  const request = useRef<(Draft & { id: string }) | null>(null);
  const savedRef = useRef<Alert | null>(null);
  const lock = useRef(false);
  const urls = useRef(new Set<string>());
  const dirty = saved ? photos.length > 0 : Object.values(draft).some(Boolean) || photos.length > 0;
  const warning = saved ? 'De melding is opgeslagen, maar er staan nog foto’s klaar voor upload. Wil je dit scherm verlaten?' : 'Je invoer en geselecteerde foto’s zijn nog niet opgeslagen. Wil je dit scherm verlaten?';
  const allowLeave = useUnsavedWarning(dirty, warning, saving);
  useEffect(() => { const activeUrls = urls.current; return () => { activeUrls.forEach(url => URL.revokeObjectURL(url)); }; }, []);
  function remove(photo: SelectedPhoto) {
    URL.revokeObjectURL(photo.url); urls.current.delete(photo.url);
    setPhotos(current => current.filter(item => item.id !== photo.id));
  }
  function select(files: FileList | null) {
    if (!files) return;
    const added: SelectedPhoto[] = [];
    let rejected = false;
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 15 * 1024 * 1024 || photos.length + added.length >= 10) { rejected = true; continue; }
      const url = URL.createObjectURL(file); urls.current.add(url);
      added.push({ id: crypto.randomUUID(), file, url });
    }
    setPhotos(current => [...current, ...added]);
    setError(rejected ? 'Kies maximaal 10 JPG- of PNG-foto’s van maximaal 15 MiB per foto.' : '');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return;
    if (!draft.title.trim()) { setError('Vul een titel in.'); return; }
    lock.current = true; setSaving(true); setError('');
    try {
      const alert = savedRef.current ?? await apiRequest<Alert>('/emergency-alerts', {
        method: 'POST', body: JSON.stringify(request.current ?? (request.current = { ...draft, id: crypto.randomUUID() })),
      });
      savedRef.current = alert; setSaved(alert); setRetrying(false);
      const failed: SelectedPhoto[] = [];
      for (const photo of photos) {
        try {
          const body = new FormData(); body.append('photoId', photo.id); body.append('photo', photo.file, photo.file.name);
          await apiRequest(`/emergency-alerts/${alert.id}/photos`, { method: 'POST', body });
          URL.revokeObjectURL(photo.url); urls.current.delete(photo.url);
        } catch { failed.push(photo); }
      }
      setPhotos(failed);
      if (failed.length) { setError(`Melding opgeslagen. ${failed.length} foto’s niet geüpload. Probeer de resterende foto’s opnieuw te uploaden.`); return; }
      allowLeave(); onSaved(alert);
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) { request.current = null; setRetrying(false); }
      else setRetrying(true);
      setError(e instanceof ApiError ? e.message : 'Opslaan niet bevestigd. Probeer opnieuw met dezelfde invoer.');
    } finally { lock.current = false; setSaving(false); }
  }
  function close() {
    if (lock.current) return;
    if (!dirty || window.confirm(warning)) { allowLeave(); onClose(); }
  }
  return <form className="glass-panel urgent-frame urgent-form" onSubmit={submit}>
    <h2>Nieuwe spoedmelding</h2>
    {saved && <p role="status">Melding online opgeslagen. Alleen de resterende foto’s hoeven nog te worden geüpload.</p>}
    <fieldset disabled={saving || retrying || !!saved}>
      <label>Titel<input required maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label>Omschrijving<textarea rows={3} maxLength={2000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
      <label>Adres<input maxLength={300} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} /></label>
      <label>Telefoonnummer<input type="tel" maxLength={60} value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></label>
      <label>Medewerker<select value={draft.assignedUserId || ''} onChange={e => setDraft({ ...draft, assignedUserId: e.target.value || null })}><option value="">Niet toegewezen</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    </fieldset>
    {retrying && <p>Opslaan is nog niet bevestigd. Je invoer blijft vaststaan zodat opnieuw proberen geen dubbele melding maakt.</p>}
    <fieldset disabled={saving || retrying}>
      <legend>Foto’s ({photos.length}/10)</legend>
      <label>Foto’s kiezen<input type="file" accept="image/jpeg,image/png" multiple disabled={photos.length >= 10} onChange={e => { select(e.target.files); e.target.value = ''; }} /></label>
      <label>Foto maken<input type="file" accept="image/jpeg,image/png" capture="environment" disabled={photos.length >= 10} onChange={e => { select(e.target.files); e.target.value = ''; }} /></label>
      <p>JPG of PNG, maximaal 15 MiB per foto. Foto’s worden geüpload bij het opslaan.</p>
      {photos.map(photo => <figure key={photo.id} style={{ margin: '12px 0' }}>
        <img src={photo.url} alt={photo.file.name} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
        <figcaption>{photo.file.name}</figcaption>
        <button type="button" className="sapphire-button sapphire-button-secondary" onClick={() => remove(photo)}>Selectie verwijderen</button>
      </figure>)}
    </fieldset>
    {error && <p role="alert" className="urgent-error">{error}</p>}
    <div className="urgent-actions">
      <button disabled={saving} className="sapphire-button urgent-button" type="submit">{saving ? 'Opslaan…' : saved ? 'Foto’s opnieuw uploaden' : retrying ? 'Opslaan opnieuw proberen' : 'Melding opslaan'}</button>
      <button disabled={saving} className="sapphire-button sapphire-button-secondary" type="button" onClick={close}>Sluiten</button>
    </div>
  </form>;
}
