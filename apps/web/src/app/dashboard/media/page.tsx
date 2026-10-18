'use client';
import { useEffect, useState } from 'react';
import type { Job, JobMedia, PaginatedResponse } from '@glaszetter/shared';
import { MEDIA_ACCEPT, MEDIA_MAX_BYTES, PHOTO_MAX_BYTES, safeMediaUrl } from '@glaszetter/shared';
import { apiRequest } from '../../../lib/api';
import styles from './media.module.css';

export default function MediaPage() {
  const [jobs, setJobs] = useState<Job[]>([]),
    [jobId, setJobId] = useState('');
  const [items, setItems] = useState<JobMedia[]>([]),
    [kind, setKind] = useState('all');
  const [caption, setCaption] = useState(''),
    [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [jobsError, setJobsError] = useState(''),
    [revision, setRevision] = useState(0),
    [jobsRevision, setJobsRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setJobsError('');
    (async () => {
      const all: Job[] = [];
      for (let page = 1; ; page++) {
        const result = await apiRequest<PaginatedResponse<Job>>(`/jobs?limit=100&page=${page}`);
        all.push(...result.data);
        if (page >= result.totalPages) break;
      }
      if (active) setJobs(all);
    })().catch(() => {
      if (active) setJobsError('Klussen laden is mislukt.');
    });
    return () => {
      active = false;
    };
  }, [jobsRevision]);
  useEffect(() => {
    let active = true;
    setItems([]);
    setError('');
    setMessage('');
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiRequest<JobMedia[]>(`/media?jobId=${encodeURIComponent(jobId)}`)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setError('Foto’s en video’s laden is mislukt. Probeer opnieuw.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId, revision]);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !jobId || busy) return;
    const form = event.currentTarget;
    setError('');
    setMessage('');
    if (
      file.size > MEDIA_MAX_BYTES ||
      (file.type.startsWith('image/') && file.size > PHOTO_MAX_BYTES)
    ) {
      setError('Foto’s mogen maximaal 15 MB zijn, video’s maximaal 50 MB.');
      return;
    }
    setBusy(true);
    const body = new FormData();
    body.append('file', file);
    body.append('caption', caption);
    try {
      const saved = await apiRequest<JobMedia>(`/media/${jobId}`, { method: 'POST', body });
      setItems((current) => [saved, ...current]);
      setFile(null);
      setCaption('');
      form.reset();
      setMessage('Opgeslagen bij deze klus.');
    } catch {
      setError(
        'Upload mislukt. Controleer je verbinding en het bestandsformaat; je selectie blijft staan.'
      );
    } finally {
      setBusy(false);
    }
  }
  const visible = items.filter((item) => kind === 'all' || item.kind === kind);
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>Klusdocumentatie</span>
        <h1>Foto’s &amp; video’s</h1>
        <p>Alle beelden van een klus, overzichtelijk bij elkaar.</p>
      </header>
      {jobsError && (
        <p role="alert">
          {jobsError} <button onClick={() => setJobsRevision((v) => v + 1)}>Opnieuw laden</button>
        </p>
      )}
      <div className={styles.selection}>
        <label htmlFor="media-job">Klus</label>
        <select
          id="media-job"
          value={jobId}
          disabled={busy}
          onChange={(e) => {
            setJobId(e.target.value);
            setFile(null);
            setCaption('');
          }}
        >
          <option value="">Kies een klus</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
      </div>
      {jobId && (
        <>
          <details className={styles.upload} key={jobId}>
            <summary>
              Beeld toevoegen <span>Foto tot 15 MB · video tot 50 MB</span>
            </summary>
            <form onSubmit={upload}>
              <label>
                Foto of video
                <input
                  aria-label="Foto of video"
                  type="file"
                  accept={MEDIA_ACCEPT}
                  disabled={busy}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              <label>
                Beschrijving (optioneel)
                <input
                  value={caption}
                  maxLength={1000}
                  disabled={busy}
                  placeholder="Bijvoorbeeld: raam vóór montage"
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <small>JPG, PNG, WEBP · MP4, MOV, WEBM</small>
              <button type="submit" disabled={!file || busy}>
                {busy ? 'Bezig met uploaden…' : 'Opslaan bij deze klus'}
              </button>
            </form>
          </details>
          <div className={styles.toolbar}>
            <div className={styles.filters} role="group" aria-label="Beeldtype">
              {(
                [
                  ['all', 'Alles'],
                  ['photo', 'Foto’s'],
                  ['video', 'Video’s'],
                ] as const
              ).map(([value, label]) => (
                <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>
                  {label}
                </button>
              ))}
            </div>
            <button
              className={styles.refresh}
              disabled={loading || busy}
              onClick={() => setRevision((v) => v + 1)}
            >
              Vernieuwen
            </button>
          </div>
          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p role="status">Beelden laden…</p>
          ) : !error && !visible.length ? (
            <p className={styles.empty}>
              Nog geen {kind === 'video' ? 'video’s' : kind === 'photo' ? 'foto’s' : 'beelden'} bij
              deze klus.
            </p>
          ) : null}
          <div className={styles.gallery}>
            {visible.map((item) => {
              const url = safeMediaUrl(item.url);
              return (
                <article key={`${item.kind}-${item.id}`} className={styles.tile}>
                  <div className={styles.tileTop}>
                    <span>{item.kind === 'video' ? 'Video' : 'Foto'}</span>
                    <time dateTime={new Date(item.createdAt).toISOString()}>
                      {new Date(item.createdAt).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </time>
                  </div>
                  <div className={styles.thumbnail}>
                    {url ? (
                      item.kind === 'video' ? (
                        <video
                          controls
                          playsInline
                          preload="metadata"
                          src={url}
                          aria-label={item.caption || item.filename}
                        />
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Foto openen: ${item.caption || item.filename}`}
                        >
                          <img src={url} alt={item.caption || 'Klusfoto'} loading="lazy" />
                        </a>
                      )
                    ) : (
                      <p>Beeldadres niet beschikbaar.</p>
                    )}
                  </div>
                  <div className={styles.tileBottom}>
                    <p title={item.caption || item.filename}>{item.caption || item.filename}</p>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${item.kind === 'video' ? 'Video' : 'Foto'} openen: ${item.caption || item.filename}`}
                      >
                        Openen <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
