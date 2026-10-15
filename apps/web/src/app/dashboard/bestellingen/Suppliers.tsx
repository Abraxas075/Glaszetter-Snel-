'use client';
import { useCallback, useEffect, useState } from 'react';
import { supplierLinks, type Supplier } from '@glaszetter/shared';
import { apiRequest } from '../../../lib/api';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setSuppliers(await apiRequest<Supplier[]>('/suppliers')); }
    catch { setError('Leveranciers laden is mislukt. Je kunt de leveranciersnaam wel zelf invullen.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return {suppliers, loading, error, load};
}

export function SupplierDirectory({suppliers, loading, error, load}: ReturnType<typeof useSuppliers>) {
  const [expanded, setExpanded] = useState(false);
  return <section className="glass-panel urgent-card" aria-label="Glasleveranciers">
    <button type="button" className="sapphire-button sapphire-button-secondary" aria-expanded={expanded} aria-controls="supplier-directory" onClick={() => setExpanded(value => !value)}>Glasleveranciers ({loading ? '…' : suppliers.length}) — {expanded ? 'sluiten' : 'contactgegevens bekijken'}</button>
    {error && <p role="alert">{error} <button type="button" onClick={() => void load()} disabled={loading}>Opnieuw laden</button></p>}
    {expanded && <div id="supplier-directory">
      {loading && <p role="status">Leveranciers laden…</p>}
      {!loading && !error && !suppliers.length && <p>Er zijn nog geen vaste leveranciers toegevoegd.</p>}
      {suppliers.map(supplier => {
        const links = supplierLinks(supplier);
        return <article key={supplier.id} className="urgent-card">
          <h3>{supplier.name}</h3>
          <p>{supplier.address}<br />{[supplier.postalCode,supplier.city].filter(Boolean).join(' ')}</p>
          {supplier.contactPerson && <p>{supplier.contactPerson}</p>}
          {supplier.phone && <p>{supplier.phone}</p>}
          {supplier.email && <p>{supplier.email}</p>}
          <div className="urgent-actions">
            {links.phone && <a className="sapphire-button sapphire-button-secondary" href={links.phone} aria-label={`Bel ${supplier.name}`}>Bellen</a>}
            {links.email && <a className="sapphire-button sapphire-button-secondary" href={links.email} aria-label={`E-mail ${supplier.name}`}>E-mail</a>}
            {links.website && <a className="sapphire-button sapphire-button-secondary" href={links.website} target="_blank" rel="noopener noreferrer" aria-label={`Website ${supplier.name}`}>Website</a>}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
