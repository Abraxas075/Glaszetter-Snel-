'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import type { Job, Project, ProjectStatus } from '@glaszetter/shared';
import { getProject, updateProject } from '../../../../lib/projects';
import { listJobs } from '../../../../lib/jobs';
import { ApiError } from '../../../../lib/api';
import { JOB_STATUS_LABELS, PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../../styles/shared';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('concept');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProject(projectId)
      .then((p) => {
        setProject(p);
        setName(p.name);
        setStatus(p.status);
        setCity(p.city ?? '');
        setAddress(p.address ?? '');
        setDescription(p.description ?? '');
      })
      .catch(() => setError('Kon project niet laden.'));

    listJobs(100, { projectId })
      .then((result) => setJobs(result.data))
      .catch(() => {});
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const updated = await updateProject(projectId, {
        name: name.trim(),
        status,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
      });
      setProject(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  if (error) return <p style={pageStyles.error}>{error}</p>;
  if (!project) return <p style={pageStyles.empty}>Laden...</p>;

  return (
    <div>
      <Link href={'/dashboard/projects' as Route} style={pageStyles.backLink}>
        ← Terug naar projecten
      </Link>
      <h1 style={pageStyles.title}>{project.name}</h1>

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
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <label style={formStyles.label} htmlFor="address">
          Adres
        </label>
        <input
          id="address"
          style={formStyles.input}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <label style={formStyles.label} htmlFor="city">
          Plaats
        </label>
        <input id="city" style={formStyles.input} value={city} onChange={(e) => setCity(e.target.value)} />

        <label style={formStyles.label} htmlFor="description">
          Omschrijving
        </label>
        <input
          id="description"
          style={formStyles.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {saveError && <p style={pageStyles.error}>{saveError}</p>}
        {saved && <p style={{ color: 'var(--color-success)', marginTop: 'var(--spacing-md)' }}>Opgeslagen.</p>}

        <button type="submit" style={formStyles.submitButton} disabled={isSaving}>
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>

      <h2 style={{ ...pageStyles.title, fontSize: 18, marginTop: 'var(--spacing-xxl)' }}>Klussen</h2>

      {jobs === null && <p style={pageStyles.empty}>Laden...</p>}
      {jobs !== null && jobs.length === 0 && <p style={pageStyles.empty}>Nog geen klussen voor dit project.</p>}

      {jobs && jobs.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Naam</th>
              <th style={pageStyles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td style={pageStyles.td}>
                  <Link href={`/dashboard/jobs/${job.id}` as Route} style={pageStyles.tdLink}>
                    {job.name}
                  </Link>
                </td>
                <td style={pageStyles.td}>{JOB_STATUS_LABELS[job.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
