'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import type { Job, Project, ProjectStatus } from '@glaszetter/shared';
import { deleteProject, getProject, updateProject } from '../../../../lib/projects';
import { createJob, listJobs } from '../../../../lib/jobs';
import { ApiError } from '../../../../lib/api';
import { JOB_STATUS_LABELS, PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../../styles/shared';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
  const [showJobForm, setShowJobForm] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      .catch(() => setJobs([]));
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    if (!name.trim()) {
      setSaveError('Naam is verplicht.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateProject(projectId, {
        name: name.trim(),
        status,
        city: city.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
      });
      setProject(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobError(null);
    if (!newJobName.trim()) {
      setJobError('Naam is verplicht.');
      return;
    }

    setIsCreatingJob(true);
    try {
      const created = await createJob({ name: newJobName.trim(), projectId });
      setNewJobName('');
      setShowJobForm(false);
      setJobs((current) => (current ? [created, ...current] : [created]));
    } catch (err) {
      setJobError(err instanceof ApiError ? err.message : 'Klus aanmaken is mislukt.');
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleDelete = async () => {
    if (!project || jobs === null || jobs.length > 0) return;
    if (!window.confirm(`Project "${project.name}" definitief verwijderen?`)) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      router.push('/dashboard/projects');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Verwijderen is mislukt.');
      setIsDeleting(false);
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

        <button type="submit" style={formStyles.submitButton} disabled={isSaving || isDeleting}>
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>

      <div style={{ ...pageStyles.headerRow, marginTop: 'var(--spacing-xxl)' }}>
        <h2 style={{ ...pageStyles.title, fontSize: 18 }}>Klussen</h2>
        <button style={pageStyles.primaryButton} onClick={() => setShowJobForm((value) => !value)}>
          {showJobForm ? 'Annuleren' : '+ Nieuwe klus'}
        </button>
      </div>

      {showJobForm && (
        <form onSubmit={handleCreateJob} style={formStyles.card}>
          <label style={formStyles.label} htmlFor="new-job-name">
            Naam
          </label>
          <input
            id="new-job-name"
            style={formStyles.input}
            value={newJobName}
            onChange={(e) => setNewJobName(e.target.value)}
            placeholder="Ramen plaatsen"
          />
          {jobError && <p style={pageStyles.error}>{jobError}</p>}
          <button type="submit" style={formStyles.submitButton} disabled={isCreatingJob}>
            {isCreatingJob ? 'Opslaan...' : 'Klus opslaan'}
          </button>
        </form>
      )}

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

      <div style={dangerZoneStyle}>
        <h2 style={dangerTitleStyle}>Project verwijderen</h2>
        <p style={pageStyles.empty}>
          {(jobs?.length ?? 0) > 0
            ? 'Dit project kan pas worden verwijderd nadat de klussen zijn verwijderd.'
            : 'Dit verwijdert het project definitief.'}
        </p>
        {deleteError && <p style={pageStyles.error}>{deleteError}</p>}
        <button
          type="button"
          style={dangerButtonStyle}
          disabled={jobs === null || jobs.length > 0 || isDeleting}
          onClick={handleDelete}
        >
          {isDeleting ? 'Verwijderen...' : 'Project verwijderen'}
        </button>
      </div>
    </div>
  );
}

const dangerZoneStyle: React.CSSProperties = {
  border: '1px solid var(--color-error)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--spacing-lg)',
  maxWidth: 480,
  marginTop: 'var(--spacing-xxl)',
};

const dangerTitleStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--color-error)',
  marginBottom: 'var(--spacing-sm)',
};

const dangerButtonStyle: React.CSSProperties = {
  marginTop: 'var(--spacing-md)',
  padding: 'var(--spacing-sm) var(--spacing-lg)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-error)',
  color: 'var(--color-background)',
  fontSize: 14,
  fontWeight: 600,
};
