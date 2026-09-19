'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Customer, Project } from '@glaszetter/shared';
import { deleteCustomer, getCustomer, updateCustomer } from '../../../../lib/customers';
import { listProjects } from '../../../../lib/projects';
import { ApiError } from '../../../../lib/api';
import { PROJECT_STATUS_LABELS } from '../../../../constants/statusLabels';
import { formStyles, pageStyles } from '../../../../styles/shared';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCustomer(customerId)
      .then((result) => {
        setCustomer(result);
        setName(result.name);
        setEmail(result.email ?? '');
        setPhone(result.phone ?? '');
        setAddress(result.address ?? '');
        setPostalCode(result.postalCode ?? '');
        setCity(result.city ?? '');
        setCountry(result.country ?? '');
        setTaxId(result.taxId ?? '');
      })
      .catch(() => setError('Kon klant niet laden.'));

    listProjects()
      .then((result) => setProjects(result.data.filter((project) => project.customerId === customerId)))
      .catch(() => setProjects([]));
  }, [customerId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    setSaved(false);
    if (!name.trim()) {
      setSaveError('Naam is verplicht.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateCustomer(customerId, {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        postalCode: postalCode.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        taxId: taxId.trim() || null,
      });
      setCustomer(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customer || (projects?.length ?? 0) > 0) return;
    if (!window.confirm(`Klant "${customer.name}" definitief verwijderen?`)) return;

    setSaveError(null);
    setIsDeleting(true);
    try {
      await deleteCustomer(customerId);
      router.push('/dashboard/customers');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Verwijderen is mislukt.');
      setIsDeleting(false);
    }
  };

  if (error) return <p style={pageStyles.error}>{error}</p>;
  if (!customer) return <p style={pageStyles.empty}>Laden...</p>;

  const hasProjects = (projects?.length ?? 0) > 0;

  return (
    <div>
      <Link href={'/dashboard/customers' as Route} style={pageStyles.backLink}>
        ← Terug naar klanten
      </Link>
      <h1 style={pageStyles.title}>{customer.name}</h1>

      <form onSubmit={handleSave} style={{ ...formStyles.card, marginTop: 'var(--spacing-lg)' }}>
        <label style={formStyles.label} htmlFor="name">Naam *</label>
        <input id="name" style={formStyles.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={formStyles.label} htmlFor="email">E-mail</label>
        <input id="email" type="email" style={formStyles.input} value={email} onChange={(e) => setEmail(e.target.value)} />

        <label style={formStyles.label} htmlFor="phone">Telefoon</label>
        <input id="phone" type="tel" style={formStyles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label style={formStyles.label} htmlFor="address">Adres</label>
        <input id="address" style={formStyles.input} value={address} onChange={(e) => setAddress(e.target.value)} />

        <label style={formStyles.label} htmlFor="postal-code">Postcode</label>
        <input id="postal-code" style={formStyles.input} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />

        <label style={formStyles.label} htmlFor="city">Plaats</label>
        <input id="city" style={formStyles.input} value={city} onChange={(e) => setCity(e.target.value)} />

        <label style={formStyles.label} htmlFor="country">Land</label>
        <input id="country" style={formStyles.input} value={country} onChange={(e) => setCountry(e.target.value)} />

        <label style={formStyles.label} htmlFor="tax-id">Btw-nummer</label>
        <input id="tax-id" style={formStyles.input} value={taxId} onChange={(e) => setTaxId(e.target.value)} />

        {saveError && <p style={pageStyles.error}>{saveError}</p>}
        {saved && <p style={successStyle}>Opgeslagen.</p>}

        <button type="submit" style={formStyles.submitButton} disabled={isSaving || isDeleting}>
          {isSaving ? 'Opslaan...' : 'Wijzigingen opslaan'}
        </button>
      </form>

      <h2 style={sectionTitleStyle}>Projecten van deze klant</h2>
      {projects === null && <p style={pageStyles.empty}>Laden...</p>}
      {projects && projects.length === 0 && <p style={pageStyles.empty}>Nog geen projecten.</p>}
      {projects && projects.length > 0 && (
        <table style={pageStyles.table}>
          <thead><tr><th style={pageStyles.th}>Naam</th><th style={pageStyles.th}>Status</th></tr></thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td style={pageStyles.td}>
                  <Link href={`/dashboard/projects/${project.id}` as Route} style={pageStyles.tdLink}>{project.name}</Link>
                </td>
                <td style={pageStyles.td}>{PROJECT_STATUS_LABELS[project.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={dangerZoneStyle}>
        <h2 style={dangerTitleStyle}>Klant verwijderen</h2>
        <p style={pageStyles.empty}>
          {hasProjects
            ? 'Deze klant kan pas worden verwijderd nadat de gekoppelde projecten zijn verwijderd.'
            : 'Dit verwijdert de klant definitief.'}
        </p>
        <button type="button" style={dangerButtonStyle} disabled={hasProjects || isDeleting} onClick={handleDelete}>
          {isDeleting ? 'Verwijderen...' : 'Klant verwijderen'}
        </button>
      </div>
    </div>
  );
}

const successStyle: React.CSSProperties = {
  color: 'var(--color-success)',
  marginTop: 'var(--spacing-md)',
};

const sectionTitleStyle: React.CSSProperties = {
  ...pageStyles.title,
  fontSize: 18,
  marginTop: 'var(--spacing-xxl)',
  marginBottom: 'var(--spacing-md)',
};

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
