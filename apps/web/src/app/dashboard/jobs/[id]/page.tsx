'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import type { Element, Job, JobStatus, Photo, Team } from '@glaszetter/shared';
import { getJob, updateJob } from '../../../../lib/jobs';
import { listElements } from '../../../../lib/elements';
import { listPhotos } from '../../../../lib/photos';
import { listTeams } from '../../../../lib/teams';
import { ApiError } from '../../../../lib/api';
import { JOB_STATUSES, JOB_STATUS_LABELS } from '../../../../constants/statusLabels';
import { ELEMENT_TYPE_LABELS } from '../../../../constants/elementTypeLabels';
import { pageStyles, formStyles } from '../../../../styles/shared';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [elements, setElements] = useState<Element[] | null>(null);
  const [jobPhotos, setJobPhotos] = useState<Photo[]>([]);
  const [elementPhotoCounts, setElementPhotoCounts] = useState<Record<string, number>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState<JobStatus>('concept');
  const [teamId, setTeamId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getJob(jobId)
      .then((j) => {
        setJob(j);
        setName(j.name);
        setStatus(j.status);
        setTeamId(j.teamId ?? '');
        setScheduledDate(j.scheduledDate ? String(j.scheduledDate).slice(0, 10) : '');
        setNotes(j.notes ?? '');
      })
      .catch(() => setError('Kon klus niet laden.'));

    listTeams()
      .then(setTeams)
      .catch(() => {});

    listElements(jobId)
      .then((result) => {
        setElements(result.data);
        return Promise.all(
          result.data.map((el) =>
            listPhotos({ elementId: el.id }).then((photos) => [el.id, photos.length] as const)
          )
        );
      })
      .then((counts) => setElementPhotoCounts(Object.fromEntries(counts)))
      .catch(() => {});

    listPhotos({ jobId }).then(setJobPhotos).catch(() => {});
  }, [jobId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const updated = await updateJob(jobId, {
        name: name.trim(),
        status,
        teamId: teamId || undefined,
        scheduledDate: scheduledDate || undefined,
        notes: notes.trim() || undefined,
      });
      setJob(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  if (error) return <p style={pageStyles.error}>{error}</p>;
  if (!job) return <p style={pageStyles.empty}>Laden...</p>;

  return (
    <div>
      <Link href={'/dashboard/jobs' as Route} style={pageStyles.backLink}>
        ← Terug naar klussen
      </Link>
      <h1 style={pageStyles.title}>{job.name}</h1>

      <form onSubmit={handleSave} style={{ ...formStyles.card, marginTop: 'var(--spacing-lg)' }}>
        <label style={formStyles.label} htmlFor="name">
          Naam
        </label>
        <input id="name" style={formStyles.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={formStyles.label} htmlFor="status">
          Status
        </label>
        <select
          id="status"
          style={formStyles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus)}
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {JOB_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <label style={formStyles.label} htmlFor="team">
          Team
        </label>
        <select
          id="team"
          style={formStyles.select}
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">Geen team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label style={formStyles.label} htmlFor="scheduledDate">
          Geplande datum
        </label>
        <input
          id="scheduledDate"
          type="date"
          style={formStyles.input}
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />

        <label style={formStyles.label} htmlFor="notes">
          Notities
        </label>
        <input id="notes" style={formStyles.input} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {saveError && <p style={pageStyles.error}>{saveError}</p>}
        {saved && <p style={{ color: 'var(--color-success)', marginTop: 'var(--spacing-md)' }}>Opgeslagen.</p>}

        <button type="submit" style={formStyles.submitButton} disabled={isSaving}>
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>

      <h2 style={{ ...pageStyles.title, fontSize: 18, marginTop: 'var(--spacing-xxl)' }}>
        Klusfoto's
      </h2>
      <p style={{ ...pageStyles.empty, marginBottom: 'var(--spacing-md)' }}>
        Foto's worden toegevoegd via de mobiele app.
      </p>

      {jobPhotos.length === 0 && <p style={pageStyles.empty}>Nog geen klusfoto's.</p>}

      {jobPhotos.length > 0 && (
        <div style={photoGalleryStyle}>
          {jobPhotos.map((photo) => (
            <img key={photo.id} src={photo.url} alt={photo.caption ?? ''} style={photoThumbStyle} />
          ))}
        </div>
      )}

      <h2 style={{ ...pageStyles.title, fontSize: 18, marginTop: 'var(--spacing-xxl)' }}>
        Ingemeten elementen
      </h2>
      <p style={{ ...pageStyles.empty, marginBottom: 'var(--spacing-md)' }}>
        Metingen worden ingevoerd via de mobiele app.
      </p>

      {elements === null && <p style={pageStyles.empty}>Laden...</p>}
      {elements !== null && elements.length === 0 && (
        <p style={pageStyles.empty}>Nog geen elementen ingemeten voor deze klus.</p>
      )}

      {elements && elements.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Code</th>
              <th style={pageStyles.th}>Type</th>
              <th style={pageStyles.th}>Locatie</th>
              <th style={pageStyles.th}>Foto's</th>
            </tr>
          </thead>
          <tbody>
            {elements.map((el) => (
              <tr key={el.id}>
                <td style={pageStyles.td}>{el.code}</td>
                <td style={pageStyles.td}>{ELEMENT_TYPE_LABELS[el.type]}</td>
                <td style={pageStyles.td}>{el.location ?? '—'}</td>
                <td style={pageStyles.td}>{elementPhotoCounts[el.id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const photoGalleryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-md)',
  flexWrap: 'wrap',
  marginBottom: 'var(--spacing-md)',
};

const photoThumbStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  objectFit: 'cover',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
};
