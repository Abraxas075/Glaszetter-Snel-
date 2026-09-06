'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import type { Job, Quote } from '@glaszetter/shared';
import { listJobs } from '../../../lib/jobs';
import { createQuote, listQuotes } from '../../../lib/quotes';
import { ApiError } from '../../../lib/api';
import { QUOTE_STATUS_LABELS } from '../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../styles/shared';

const formatCurrency = (amount: number): string =>
  `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [jobId, setJobId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    listQuotes()
      .then(setQuotes)
      .catch(() => setError('Kon offertes niet laden.'));
  };

  useEffect(() => {
    load();
    listJobs().then((result) => setJobs(result.data)).catch(() => {});
  }, []);

  const jobName = (id: string) => jobs.find((j) => j.id === id)?.name ?? '—';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!jobId) {
      setFormError('Kies een klus.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createQuote({ jobId, validUntil: validUntil || undefined });
      setJobId('');
      setValidUntil('');
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Aanmaken is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={pageStyles.headerRow}>
        <h1 style={pageStyles.title}>Offertes</h1>
        <button style={pageStyles.primaryButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuleren' : '+ Nieuwe offerte'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyles.card}>
          <label style={formStyles.label} htmlFor="job">
            Klus
          </label>
          <select id="job" style={formStyles.select} value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Kies een klus...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>

          <label style={formStyles.label} htmlFor="validUntil">
            Geldig tot
          </label>
          <input
            id="validUntil"
            type="date"
            style={formStyles.input}
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />

          {formError && <p style={pageStyles.error}>{formError}</p>}

          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {error && <p style={pageStyles.error}>{error}</p>}

      {!error && quotes === null && <p style={pageStyles.empty}>Laden...</p>}

      {!error && quotes !== null && quotes.length === 0 && (
        <p style={pageStyles.empty}>Nog geen offertes aangemaakt.</p>
      )}

      {quotes && quotes.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Nummer</th>
              <th style={pageStyles.th}>Klus</th>
              <th style={pageStyles.th}>Status</th>
              <th style={pageStyles.th}>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td style={pageStyles.td}>
                  <Link href={`/dashboard/quotes/${quote.id}` as Route} style={pageStyles.tdLink}>
                    {quote.quoteNumber}
                  </Link>
                </td>
                <td style={pageStyles.td}>{jobName(quote.jobId)}</td>
                <td style={pageStyles.td}>{QUOTE_STATUS_LABELS[quote.status]}</td>
                <td style={pageStyles.td}>{formatCurrency(quote.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
