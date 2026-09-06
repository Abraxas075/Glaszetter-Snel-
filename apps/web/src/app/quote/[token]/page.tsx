'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { PublicQuoteView } from '@glaszetter/shared';
import {
  approvePublicQuote,
  getPublicQuote,
  getPublicQuotePdfUrl,
  PublicQuoteError,
  rejectPublicQuote,
} from '../../../lib/publicQuotes';

const formatCurrency = (amount: number): string =>
  `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date?: Date | string): string =>
  date ? new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export default function PublicQuotePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [view, setView] = useState<PublicQuoteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    getPublicQuote(token)
      .then(setView)
      .catch((err) =>
        setError(err instanceof PublicQuoteError ? err.message : 'Deze offerte kon niet worden geladen.')
      );
  };

  useEffect(load, [token]);

  const handleApprove = async () => {
    setActionError(null);
    setIsSubmitting(true);
    try {
      const quote = await approvePublicQuote(token);
      setView((prev) => (prev ? { ...prev, quote } : prev));
    } catch (err) {
      setActionError(err instanceof PublicQuoteError ? err.message : 'Goedkeuren is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setActionError(null);
    setIsSubmitting(true);
    try {
      const quote = await rejectPublicQuote(token, reason.trim() || undefined);
      setView((prev) => (prev ? { ...prev, quote } : prev));
    } catch (err) {
      setActionError(err instanceof PublicQuoteError ? err.message : 'Afwijzen is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div style={pageWrapStyle}>
        <div style={cardStyle}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div style={pageWrapStyle}>
        <div style={cardStyle}>
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  const { quote, company, customer } = view;
  const decided = quote.status === 'approved' || quote.status === 'rejected';

  return (
    <div style={pageWrapStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{company.name}</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>
          {[company.address, [company.postalCode, company.city].filter(Boolean).join(' ')]
            .filter(Boolean)
            .join(' · ')}
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Offerte {quote.quoteNumber}</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 20 }}>
          Geldig tot {formatDate(quote.validUntil)}
        </p>

        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Klant</p>
        <p style={{ marginBottom: 20 }}>{customer.name}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={thStyle}>Omschrijving</th>
              <th style={thStyle}>Aantal</th>
              <th style={thStyle}>Prijs</th>
              <th style={thStyle}>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={line.id}>
                <td style={tdStyle}>{line.description}</td>
                <td style={tdStyle}>{line.quantity}</td>
                <td style={tdStyle}>{formatCurrency(line.unitPrice)}</td>
                <td style={tdStyle}>{formatCurrency(line.quantity * line.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ maxWidth: 280, marginLeft: 'auto', marginBottom: 24 }}>
          <div style={totalsRowStyle}>
            <span>Subtotaal</span>
            <span>{formatCurrency(quote.subtotal)}</span>
          </div>
          <div style={totalsRowStyle}>
            <span>BTW ({quote.vatRate}%)</span>
            <span>{formatCurrency(quote.vatAmount)}</span>
          </div>
          <div style={{ ...totalsRowStyle, fontWeight: 700, fontSize: 16 }}>
            <span>Totaal</span>
            <span>{formatCurrency(quote.total)}</span>
          </div>
        </div>

        <a
          href={getPublicQuotePdfUrl(token)}
          target="_blank"
          rel="noreferrer"
          style={{ ...buttonStyle, display: 'inline-block', textDecoration: 'none', marginBottom: 24 }}
        >
          Download PDF
        </a>

        {decided ? (
          <div style={statusBannerStyle}>
            {quote.status === 'approved' && (
              <p>✓ U heeft deze offerte goedgekeurd op {formatDate(quote.approvedAt)}.</p>
            )}
            {quote.status === 'rejected' && (
              <>
                <p>U heeft deze offerte afgewezen op {formatDate(quote.rejectedAt)}.</p>
                {quote.rejectionReason && (
                  <p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>
                    Reden: {quote.rejectionReason}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            {actionError && <p style={{ color: 'var(--color-error)', marginBottom: 12 }}>{actionError}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" style={buttonStyle} onClick={handleApprove} disabled={isSubmitting}>
                Goedkeuren
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => setShowRejectForm((v) => !v)}
                disabled={isSubmitting}
              >
                Afwijzen
              </button>
            </div>

            {showRejectForm && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }} htmlFor="reason">
                  Reden (optioneel)
                </label>
                <textarea
                  id="reason"
                  style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid var(--color-border)', borderRadius: 8 }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <button
                  type="button"
                  style={{ ...secondaryButtonStyle, marginTop: 10 }}
                  onClick={handleReject}
                  disabled={isSubmitting}
                >
                  Bevestig afwijzen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const pageWrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--color-background)',
  display: 'flex',
  justifyContent: 'center',
  padding: '48px 16px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 32,
  maxWidth: 640,
  width: '100%',
  height: 'fit-content',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 4px',
  borderBottom: '2px solid var(--color-border)',
  fontSize: 12,
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 4px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 14,
};

const totalsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-background)',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)',
};

const statusBannerStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-background)',
  border: '1px solid var(--color-border)',
};
