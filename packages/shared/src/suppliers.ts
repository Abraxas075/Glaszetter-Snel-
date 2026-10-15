export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  website: string | null;
  notes: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
}

export function supplierLinks(supplier: Pick<Supplier, 'phone' | 'email' | 'website'>) {
  const digits = supplier.phone?.replace(/[\s().-]/g, '') ?? '';
  const phone = /^\+?\d{6,15}$/.test(digits) ? `tel:${digits}` : null;
  const email = supplier.email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(supplier.email)
    ? `mailto:${encodeURIComponent(supplier.email)}` : null;
  let website: string | null = null;
  try {
    const url = new URL(supplier.website ?? '');
    if (url.protocol === 'https:' && !url.username && !url.password) website = url.href;
  } catch { /* No link for a missing or invalid website. */ }
  return {phone, email, website};
}
