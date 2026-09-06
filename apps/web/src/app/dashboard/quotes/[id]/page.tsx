'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import type { Element, Quote, QuoteStatus } from '@glaszetter/shared';
import {
  addQuoteLine,
  convertQuoteToInvoice,
  deleteQuoteLine,
  downloadQuotePdf,
  getQuote,
  regenerateQuoteLink,
  updateQuote,
} from '../../../../lib/quotes';
import { listElements } from '../../../../lib/elements';
import { ApiError } from '../../../../lib/api';
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from '../../../../constants/statusLabels';
import { pageStyles, formStyles } from '../../../../styles/shared';
import { LineItemsEditor, type LineItemInput } from '../../../../components/LineItemsEditor';

const formatDate = (date?: Date): string =>
  date ? new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quoteId = params.id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<QuoteStatus>('concept');
  const [validUntil, setValidUntil] = useState('');
  const [vatRate, setVatRate] = useState('21');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isRegeneratingLink, setIsRegeneratingLink] = useState(false);

  const load = () => {
    getQuote(quoteId)
      .then((q) => {
        setQuote(q);
        setStatus(q.status);
        setValidUntil(q.validUntil ? String(q.validUntil).slice(0, 10) : '');
        setVatRate(String(q.vatRate));
        setNotes(q.notes ?? '');
        return listElements(q.jobId);
      })
      .then((result) => setElements(result.data))
      .catch(() => setError('Kon offerte niet laden.'));
  };

  useEffect(load, [quoteId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const updated = await updateQuote(quoteId, {
        status,
        vatRate: parseFloat(vatRate.replace(',', '.')) || undefined,
        validUntil: validUntil || undefined,
        notes: notes.trim() || undefined,
      });
      setQuote(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLine = async (input: LineItemInput) => {
    await addQuoteLine(quoteId, input);
    load();
  };

  const handleDeleteLine = async (lineId: string) => {
    await deleteQuoteLine(quoteId, lineId);
    load();
  };

  const handleDownloadPdf = async () => {
    const blob = await downloadQuotePdf(quoteId);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleCopyLink = async () => {
    if (!quote) return;
    const url = `${window.location.origin}/quote/${quote.publicToken}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleRegenerateLink = async () => {
    setIsRegeneratingLink(true);
    try {
      const updated = await regenerateQuoteLink(quoteId);
      setQuote(updated);
    } catch {
      // stil laten, gebruiker kan het opnieuw proberen
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleConvert = async () => {
    setConvertError(null);
    setIsConverting(true);
    try {
      const result = await convertQuoteToInvoice(quoteId);
      router.push(`/dashboard/invoices/${result.invoiceId}` as Route);
    } catch (err) {
      setConvertError(err instanceof ApiError ? err.message : 'Omzetten is mislukt.');
      setIsConverting(false);
    }
  };

  if (error) return <p style={pageStyles.error}>{error}</p>;
  if (!quote) return <p style={pageStyles.empty}>Laden...</p>;

  return (
    <div>
      <Link href={'/dashboard/quotes' as Route} style={pageStyles.backLink}>
        ← Terug naar offertes
      </Link>
      <h1 style={pageStyles.title}>{quote.quoteNumber}</h1>

      <form onSubmit={handleSave} style={{ ...formStyles.card, marginTop: 'var(--spacing-lg)' }}>
        <label style={formStyles.label} htmlFor="status">
          Status
        </label>
        <select
          id="status"
          style={formStyles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as QuoteStatus)}
        >
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
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

        <label style={formStyles.label} htmlFor="vatRate">
          BTW-percentage
        </label>
        <input
          id="vatRate"
          type="number"
          step="0.01"
          style={formStyles.input}
          value={vatRate}
          onChange={(e) => setVatRate(e.target.value)}
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

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        <button type="button" style={pageStyles.primaryButton} onClick={handleDownloadPdf}>
          Download PDF
        </button>
        <button type="button" style={pageStyles.primaryButton} onClick={handleCopyLink}>
          {linkCopied ? 'Gekopieerd!' : 'Kopieer klantlink'}
        </button>
        <button type="button" style={pageStyles.primaryButton} onClick={handleRegenerateLink} disabled={isRegeneratingLink}>
          {isRegeneratingLink ? 'Bezig...' : 'Vernieuw link'}
        </button>
        {quote.status === 'approved' && (
          <button type="button" style={pageStyles.primaryButton} onClick={handleConvert} disabled={isConverting}>
            {isConverting ? 'Bezig...' : 'Zet om naar factuur'}
          </button>
        )}
      </div>
      {convertError && <p style={pageStyles.error}>{convertError}</p>}

      {(quote.approvedAt || quote.rejectedAt) && (
        <div style={{ ...formStyles.card, marginTop: 'var(--spacing-lg)', backgroundColor: 'var(--color-background)' }}>
          {quote.approvedAt && <p>✓ Klant heeft goedgekeurd op {formatDate(quote.approvedAt)}.</p>}
          {quote.rejectedAt && (
            <>
              <p>Klant heeft afgewezen op {formatDate(quote.rejectedAt)}.</p>
              {quote.rejectionReason && (
                <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                  Reden: {quote.rejectionReason}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 'var(--spacing-xl)' }} />

      <h2 style={{ ...pageStyles.title, fontSize: 18, marginBottom: 'var(--spacing-md)' }}>Regels</h2>
      <LineItemsEditor
        lines={quote.lines}
        elements={elements}
        vatRate={quote.vatRate}
        subtotal={quote.subtotal}
        vatAmount={quote.vatAmount}
        total={quote.total}
        onAddLine={handleAddLine}
        onDeleteLine={handleDeleteLine}
      />
    </div>
  );
}
