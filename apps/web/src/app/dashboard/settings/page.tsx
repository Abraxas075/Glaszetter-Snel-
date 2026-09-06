'use client';

import { useEffect, useState } from 'react';
import type { Company } from '@glaszetter/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { getMyCompany, updateMyCompany } from '../../../lib/companies';
import { ApiError } from '../../../lib/api';
import { pageStyles, formStyles } from '../../../styles/shared';

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [iban, setIban] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyCompany()
      .then((c) => {
        setCompany(c);
        setName(c.name);
        setAddress(c.address ?? '');
        setCity(c.city ?? '');
        setPostalCode(c.postalCode ?? '');
        setCountry(c.country ?? '');
        setPhone(c.phone ?? '');
        setEmail(c.email ?? '');
        setTaxId(c.taxId ?? '');
        setIban(c.iban ?? '');
      })
      .catch(() => setError('Kon bedrijfsgegevens niet laden.'));
  }, []);

  if (!isAdmin) {
    return (
      <div>
        <h1 style={pageStyles.title}>Instellingen</h1>
        <p style={pageStyles.empty}>
          Alleen eigenaren en beheerders kunnen bedrijfsgegevens bewerken.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const updated = await updateMyCompany({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        taxId: taxId.trim() || undefined,
        iban: iban.trim() || undefined,
      });
      setCompany(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
    } finally {
      setIsSaving(false);
    }
  };

  if (error) return <p style={pageStyles.error}>{error}</p>;
  if (!company) return <p style={pageStyles.empty}>Laden...</p>;

  return (
    <div>
      <h1 style={pageStyles.title}>Instellingen</h1>
      <p style={{ ...pageStyles.empty, marginBottom: 'var(--spacing-md)' }}>
        Deze gegevens verschijnen in het briefhoofd van offertes en facturen.
      </p>

      <form onSubmit={handleSave} style={formStyles.card}>
        <label style={formStyles.label} htmlFor="name">
          Bedrijfsnaam
        </label>
        <input id="name" style={formStyles.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={formStyles.label} htmlFor="address">
          Adres
        </label>
        <input id="address" style={formStyles.input} value={address} onChange={(e) => setAddress(e.target.value)} />

        <label style={formStyles.label} htmlFor="city">
          Plaats
        </label>
        <input id="city" style={formStyles.input} value={city} onChange={(e) => setCity(e.target.value)} />

        <label style={formStyles.label} htmlFor="postalCode">
          Postcode
        </label>
        <input
          id="postalCode"
          style={formStyles.input}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />

        <label style={formStyles.label} htmlFor="country">
          Land
        </label>
        <input id="country" style={formStyles.input} value={country} onChange={(e) => setCountry(e.target.value)} />

        <label style={formStyles.label} htmlFor="phone">
          Telefoon
        </label>
        <input id="phone" style={formStyles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label style={formStyles.label} htmlFor="email">
          E-mail
        </label>
        <input id="email" type="email" style={formStyles.input} value={email} onChange={(e) => setEmail(e.target.value)} />

        <label style={formStyles.label} htmlFor="taxId">
          BTW-nummer
        </label>
        <input id="taxId" style={formStyles.input} value={taxId} onChange={(e) => setTaxId(e.target.value)} />

        <label style={formStyles.label} htmlFor="iban">
          IBAN
        </label>
        <input id="iban" style={formStyles.input} value={iban} onChange={(e) => setIban(e.target.value)} />

        {saveError && <p style={pageStyles.error}>{saveError}</p>}
        {saved && <p style={{ color: 'var(--color-success)', marginTop: 'var(--spacing-md)' }}>Opgeslagen.</p>}

        <button type="submit" style={formStyles.submitButton} disabled={isSaving}>
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>
    </div>
  );
}
