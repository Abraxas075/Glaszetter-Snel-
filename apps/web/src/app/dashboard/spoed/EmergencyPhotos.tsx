'use client';
import { useEffect, useState } from 'react';
import { apiRequest, fetchBlob } from '../../../lib/api';

interface Photo { id: string; filename: string; }
export function EmergencyPhotos({ alertId }: { alertId: string }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [photos, setPhotos] = useState<(Photo & { url: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true;
    const urls: string[] = [];
    setPhotos([]); setLoading(true); setError('');
    void (async () => {
      try {
        const list = await apiRequest<Photo[]>(`/emergency-alerts/${alertId}/photos`);
        const loaded = [];
        for (const photo of list) {
          if (!active) return;
          const blob = await fetchBlob(`/emergency-alerts/${alertId}/photos/${photo.id}`);
          if (!active) return;
          const url = URL.createObjectURL(blob);
          urls.push(url); loaded.push({ ...photo, url });
        }
        if (active) setPhotos(loaded);
      } catch {
        urls.forEach(url => URL.revokeObjectURL(url)); urls.length = 0;
        if (active) setError('Foto’s laden is mislukt. Probeer opnieuw.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [open, alertId, attempt]);
  return <div>
    <button className="sapphire-button sapphire-button-secondary" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Foto’s sluiten' : 'Foto’s bekijken'}</button>
    {open && <div>
      {loading && <p role="status">Foto’s laden…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Opnieuw proberen</button></p>}
      {!loading && !error && photos.length === 0 && <p>Geen foto’s bij deze melding.</p>}
      {!loading && !error && photos.map(photo => <figure key={photo.id} style={{ margin: '12px 0' }}>
        {/* Authenticated images use temporary blob URLs, released when this view closes. */}
        <img src={photo.url} alt={photo.filename} style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }} />
        <figcaption>{photo.filename}</figcaption>
      </figure>)}
    </div>}
  </div>;
}
