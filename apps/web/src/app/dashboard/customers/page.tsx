'use client';

import { useEffect, useState } from 'react';
import type { Customer } from '@glaszetter/shared';
import { createCustomer, listCustomers } from '../../../lib/customers';
import { ApiError } from '../../../lib/api';
import { formStyles, pageStyles } from '../../../styles/shared';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    listCustomers()
      .then((result) => setCustomers(result.data))
      .catch(() => setError('Kon klanten niet laden.'));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Naam is verplicht.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCustomer({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
      });
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setPostalCode('');
      setCity('');
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Klant aanmaken is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={pageStyles.headerRow}>
        <h1 style={pageStyles.title}>Klanten</h1>
        <button style={pageStyles.primaryButton} onClick={() => setShowForm((visible) => !visible)}>
          {showForm ? 'Annuleren' : '+ Nieuwe klant'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyles.card}>
          <label style={formStyles.label} htmlFor="customer-name">
            Naam *
          </label>
          <input
            id="customer-name"
            style={formStyles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Naam of bedrijfsnaam"
            autoFocus
          />

          <label style={formStyles.label} htmlFor="customer-email">
            E-mail
          </label>
          <input
            id="customer-email"
            type="email"
            style={formStyles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="klant@voorbeeld.nl"
          />

          <label style={formStyles.label} htmlFor="customer-phone">
            Telefoon
          </label>
          <input
            id="customer-phone"
            type="tel"
            style={formStyles.input}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="06 12345678"
          />

          <label style={formStyles.label} htmlFor="customer-address">
            Adres
          </label>
          <input
            id="customer-address"
            style={formStyles.input}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Straat en huisnummer"
          />

          <label style={formStyles.label} htmlFor="customer-postal-code">
            Postcode
          </label>
          <input
            id="customer-postal-code"
            style={formStyles.input}
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            placeholder="1234 AB"
          />

          <label style={formStyles.label} htmlFor="customer-city">
            Plaats
          </label>
          <input
            id="customer-city"
            style={formStyles.input}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Zaandam"
          />

          {formError && <p style={pageStyles.error}>{formError}</p>}

          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Opslaan...' : 'Klant opslaan'}
          </button>
        </form>
      )}

      {error && <p style={pageStyles.error}>{error}</p>}

      {!error && customers === null && <p style={pageStyles.empty}>Laden...</p>}

      {!error && customers !== null && customers.length === 0 && (
        <p style={pageStyles.empty}>Nog geen klanten toegevoegd.</p>
      )}

      {customers && customers.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Naam</th>
              <th style={pageStyles.th}>E-mail</th>
              <th style={pageStyles.th}>Plaats</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td style={pageStyles.td}>{customer.name}</td>
                <td style={pageStyles.td}>{customer.email ?? '—'}</td>
                <td style={pageStyles.td}>{customer.city ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
