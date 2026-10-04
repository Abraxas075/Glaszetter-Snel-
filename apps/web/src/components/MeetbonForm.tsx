'use client';
import { useEffect, useState } from 'react';
import { compareMeetbons, resolveMeetbonComparison, type MeetbonComparison, emptyMeetbon, isMeetbon, MEETBON_SECTIONS, type Meetbon } from '@glaszetter/shared';
import { ApiError, apiRequest, fetchBlob } from '../lib/api';
import { formStyles, pageStyles } from '../styles/shared';
export function MeetbonForm({ jobId }: { jobId: string }) {
  const [data, setData] = useState<Meetbon>(emptyMeetbon);
  const [savedData, setSavedData] = useState<Meetbon>(emptyMeetbon);
  const [comparison, setComparison] = useState<MeetbonComparison | null>(null);
  const [choices, setChoices] = useState<Record<string, 'own' | 'latest'>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setLoaded(false); setComparison(null); setChoices({}); setMessage('');
    apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`).then(d => { if (active) { setData(d); setSavedData(d); setLoaded(true); } })
      .catch(() => { if (active) setMessage('Meetbon laden mislukt. Herlaad de pagina om opnieuw te proberen.'); });
    return () => { active = false; };
  }, [jobId]);
  async function handleConflict(err: unknown): Promise<boolean> {
    if (!(err instanceof ApiError) || err.code !== 'MEETBON_CHANGED') return false;
    try {
      const latest = await apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, {});
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
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!loaded || busy || !!comparison) return;
    if (!isMeetbon(data)) { setMessage('Controleer aantallen, maten en teksten (maximaal 2000 tekens per tekstveld).'); return; }
    setBusy(true); setMessage('');
    try { const savedBon = await apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { method: 'PUT', body: JSON.stringify(data) }); setSavedData(savedBon); setData(savedBon); setMessage('Meetbon opgeslagen.'); }
    catch (err) { if (await handleConflict(err)) return; setMessage(err instanceof ApiError && err.status === 413 ? 'De meetbon is te groot (maximaal 8 MiB). Je invoer blijft staan.' : 'Opslaan mislukt. Je invoer staat nog in het formulier.'); }
    finally { setBusy(false); }
  };
  const downloadPdf = async () => {
    if (!loaded || busy || !!comparison) return;
    if (!isMeetbon(data)) { setMessage('Controleer aantallen, maten en teksten (maximaal 2000 tekens per tekstveld).'); return; }
    setBusy(true); setExporting(true); setMessage('');
    let saved = false;
    try {
      const savedBon = await apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`, { method: 'PUT', body: JSON.stringify(data) });
      setSavedData(savedBon); setData(savedBon);
      saved = true;
      const blob = await fetchBlob(`/jobs/${jobId}/meetbon/pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'Meetbon.pdf';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage('Meetbon opgeslagen. PDF-download gestart.');
    } catch (err) {
      if (await handleConflict(err)) return;
      setMessage(!saved && err instanceof ApiError && err.status === 413 ? 'De meetbon is te groot (maximaal 8 MiB). Je invoer blijft staan.' : saved ? 'Meetbon opgeslagen, maar PDF downloaden is mislukt. Probeer opnieuw.' : 'Opslaan mislukt. Je invoer staat nog in het formulier.');
    } finally { setBusy(false); setExporting(false); }
  };
  async function removeBon() {
    if (!loaded || busy || !!comparison) return;
    setBusy(true); setMessage('');
    try {
      await apiRequest(`/jobs/${jobId}/meetbon`, { method: 'DELETE', body: JSON.stringify(savedData) });
      const empty = { ...emptyMeetbon(), revision: null }; setData(empty); setSavedData(empty);
      setMessage('Meetbon verwijderd. Klus, inmetingen en foto’s zijn behouden.');
    } catch (err) {
      if (await handleConflict(err)) return;
      setMessage(err instanceof ApiError && err.code === 'MEETBON_CHANGED' ? err.message : 'Verwijderen mislukt. Je invoer blijft staan.');
    } finally { setBusy(false); }
  }
  function confirmRemove() {
    if (!loaded || busy || !!comparison) return;
    if (window.confirm('Meetbon verwijderen? De opgeslagen meetbon en niet-opgeslagen invoer in dit scherm worden verwijderd. Klus, inmetingen en foto’s blijven behouden.')) void removeBon();
  }
  return <section style={{ marginTop: 32 }}>
    <h2 style={pageStyles.title}>Digitale meetbon</h2>
    <a href="/templates/Meetbon_Glaszettersnel_digitaal.xlsx" download>Originele Excel-meetbon downloaden</a>
    <p>Gebaseerd op je meetbon. Alle glasmaten zijn in mm. Opgeslagen ruiten in deze bon staan los van de ingemeten elementen.</p>
    {comparison && <aside aria-label="Wijzigingen vergelijken" style={{ padding: 16, border: '2px solid var(--color-primary)' }}>
      <h3>Wijzigingen vergelijken</h3><p>Niet-overlappende wijzigingen worden samengevoegd. Bij gelijktijdig gewijzigde ruiten kies je de volledige lijst.</p>
      {comparison.conflicts.map(c => <fieldset key={c.key}><legend>{c.label}</legend>
        <p>Eigen invoer: {JSON.stringify(c.own)}</p><p>Nieuwste bon: {JSON.stringify(c.latest)}</p>
        <label><input type="radio" name={c.key} checked={choices[c.key] === 'own'} onChange={() => setChoices({ ...choices, [c.key]: 'own' })} /> Eigen invoer behouden</label>
        <label><input type="radio" name={c.key} checked={choices[c.key] === 'latest'} onChange={() => setChoices({ ...choices, [c.key]: 'latest' })} /> Nieuwste invoer behouden</label>
      </fieldset>)}
      <button type="button" onClick={applyComparison}>Verschillen verwerken</button>
    </aside>}
    <form onSubmit={save}>
      <fieldset disabled={!loaded || busy || !!comparison} style={{ border: 0, padding: 0 }}>
        {MEETBON_SECTIONS.map(section => <fieldset key={section.title} style={{ border: '1px solid var(--color-primary)', borderRadius: 8, padding: 16, marginTop: 16 }}>
          <legend>{section.title}</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {section.fields.map(f => <label key={f.key} style={formStyles.label}>{f.label}<input maxLength={2000} style={formStyles.input} value={data.fields[f.key] ?? ''} onChange={e => setData({ ...data, fields: { ...data.fields, [f.key]: e.target.value } })} /></label>)}
          </div>
          {section.checks.map(c => <label key={c.key} style={{ display: 'inline-flex', gap: 8, margin: 10 }}><input type="checkbox" checked={data.checks[c.key] ?? false} onChange={e => setData({ ...data, checks: { ...data.checks, [c.key]: e.target.checked } })} />{c.label}</label>)}
          {section.title === 'Extra werkzaamheden' && <p>Bij schilderwerk: voeg foto’s toe bij de klus.</p>}
        </fieldset>)}
        <h3 style={{ marginTop: 24 }}>Ruiten — aantal, breedte × hoogte, soort glas en opmerking</h3>
        {data.lines.map((line, index) => <fieldset key={index} style={{ marginTop: 12, padding: 12, border: '1px solid var(--color-border)' }}>
          <legend>Ruit {index + 1}</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {(['quantity', 'width', 'height', 'glassType', 'notes'] as const).map(key => <label key={key}>{({ quantity: 'Aantal', width: 'Breedte (mm)', height: 'Hoogte (mm)', glassType: 'Soort glas', notes: 'Opmerking' })[key]}<input maxLength={key === 'glassType' || key === 'notes' ? 2000 : undefined} style={formStyles.input} type={key === 'glassType' || key === 'notes' ? 'text' : 'number'} min="1" step={key === 'quantity' ? '1' : 'any'} required={key !== 'glassType' && key !== 'notes'} value={line[key] || ''} onChange={e => setData({ ...data, lines: data.lines.map((l, i) => i === index ? { ...l, [key]: key === 'glassType' || key === 'notes' ? e.target.value : Number(e.target.value) } : l) })} /></label>)}
          </div>
          <button type="button" onClick={() => setData({ ...data, lines: data.lines.filter((_, i) => i !== index) })}>Ruit verwijderen</button>
        </fieldset>)}
        <button type="button" disabled={data.lines.length >= 200} onClick={() => setData({ ...data, lines: [...data.lines, { quantity: 1, width: 0, height: 0, glassType: '', notes: '' }] })}>＋ Ruit toevoegen</button>
        <p>Totaal: {data.lines.reduce((n, l) => n + l.quantity * l.width * l.height / 1e6, 0).toLocaleString('nl-NL', { maximumFractionDigits: 3 })} m²</p>
        <button style={formStyles.submitButton} type="submit">{busy && !exporting ? 'Opslaan…' : 'Meetbon opslaan'}</button>
        <button style={{ ...formStyles.submitButton, marginLeft: 12 }} type="button" onClick={downloadPdf}>
          {exporting ? 'PDF maken…' : 'Opslaan en PDF downloaden'}
        </button>
        <button type="button" onClick={confirmRemove} style={{ marginLeft: 12 }}>Meetbon verwijderen</button>
        <p>De PDF bevat de ingevulde meetbon en beschikbare klus- en elementfoto’s. Niet ingesloten foto’s worden vermeld.</p>
      </fieldset>
      <p role="status">{message || (!loaded ? 'Meetbon laden…' : '')}</p>
    </form>
  </section>;
}
