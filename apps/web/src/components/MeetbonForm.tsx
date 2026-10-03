'use client';
import { useEffect, useState } from 'react';
import { emptyMeetbon, isMeetbon, MEETBON_SECTIONS, type Meetbon } from '@glaszetter/shared';
import { apiRequest, fetchBlob } from '../lib/api';
import { formStyles, pageStyles } from '../styles/shared';
export function MeetbonForm({ jobId }: { jobId: string }) {
  const [data, setData] = useState<Meetbon>(emptyMeetbon);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setLoaded(false); setMessage('');
    apiRequest<Meetbon>(`/jobs/${jobId}/meetbon`).then(d => { if (active) { setData(d); setLoaded(true); } })
      .catch(() => { if (active) setMessage('Meetbon laden mislukt. Herlaad de pagina om opnieuw te proberen.'); });
    return () => { active = false; };
  }, [jobId]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!loaded || busy) return;
    if (!isMeetbon(data)) { setMessage('Vul een positief aantal, breedte en hoogte in voor elke ruit.'); return; }
    setBusy(true); setMessage('');
    try { await apiRequest(`/jobs/${jobId}/meetbon`, { method: 'PUT', body: JSON.stringify(data) }); setMessage('Meetbon opgeslagen.'); }
    catch { setMessage('Opslaan mislukt. Je invoer staat nog in het formulier.'); }
    finally { setBusy(false); }
  };
  const downloadPdf = async () => {
    if (!loaded || busy) return;
    if (!isMeetbon(data)) { setMessage('Vul een positief aantal, breedte en hoogte in voor elke ruit.'); return; }
    setBusy(true); setExporting(true); setMessage('');
    let saved = false;
    try {
      await apiRequest(`/jobs/${jobId}/meetbon`, { method: 'PUT', body: JSON.stringify(data) });
      saved = true;
      const blob = await fetchBlob(`/jobs/${jobId}/meetbon/pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'Meetbon.pdf';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage('Meetbon opgeslagen. PDF-download gestart.');
    } catch {
      setMessage(saved ? 'Meetbon opgeslagen, maar PDF downloaden is mislukt. Probeer opnieuw.' : 'Opslaan mislukt. Je invoer staat nog in het formulier.');
    } finally { setBusy(false); setExporting(false); }
  };
  return <section style={{ marginTop: 32 }}>
    <h2 style={pageStyles.title}>Digitale meetbon</h2>
    <a href="/templates/Meetbon_Glaszettersnel_digitaal.xlsx" download>Originele Excel-meetbon downloaden</a>
    <p>Gebaseerd op je meetbon. Alle glasmaten zijn in mm. Opgeslagen ruiten in deze bon staan los van de ingemeten elementen.</p>
    <form onSubmit={save}>
      <fieldset disabled={!loaded || busy} style={{ border: 0, padding: 0 }}>
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
            {(['quantity', 'width', 'height', 'glassType', 'notes'] as const).map(key => <label key={key}>{({ quantity: 'Aantal', width: 'Breedte (mm)', height: 'Hoogte (mm)', glassType: 'Soort glas', notes: 'Opmerking' })[key]}<input style={formStyles.input} type={key === 'glassType' || key === 'notes' ? 'text' : 'number'} min="1" step={key === 'quantity' ? '1' : 'any'} required={key !== 'glassType' && key !== 'notes'} value={line[key] || ''} onChange={e => setData({ ...data, lines: data.lines.map((l, i) => i === index ? { ...l, [key]: key === 'glassType' || key === 'notes' ? e.target.value : Number(e.target.value) } : l) })} /></label>)}
          </div>
          <button type="button" onClick={() => setData({ ...data, lines: data.lines.filter((_, i) => i !== index) })}>Ruit verwijderen</button>
        </fieldset>)}
        <button type="button" disabled={data.lines.length >= 200} onClick={() => setData({ ...data, lines: [...data.lines, { quantity: 1, width: 0, height: 0, glassType: '', notes: '' }] })}>＋ Ruit toevoegen</button>
        <p>Totaal: {data.lines.reduce((n, l) => n + l.quantity * l.width * l.height / 1e6, 0).toLocaleString('nl-NL', { maximumFractionDigits: 3 })} m²</p>
        <button style={formStyles.submitButton} type="submit">{busy && !exporting ? 'Opslaan…' : 'Meetbon opslaan'}</button>
        <button style={{ ...formStyles.submitButton, marginLeft: 12 }} type="button" onClick={downloadPdf}>
          {exporting ? 'PDF maken…' : 'Opslaan en PDF downloaden'}
        </button>
        <p>De PDF bevat de ingevulde meetbon en beschikbare klus- en elementfoto’s. Niet ingesloten foto’s worden vermeld.</p>
      </fieldset>
      <p role="status">{message || (!loaded ? 'Meetbon laden…' : '')}</p>
    </form>
  </section>;
}
