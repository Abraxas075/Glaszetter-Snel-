import type {
  Company,
  Customer,
  Element,
  ElementType,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Job,
  JobStatus,
  Measurement,
  MeasurementStatus,
  Photo,
  Project,
  ProjectStatus,
  Quote,
  QuoteLine,
  QuoteStatus,
  Team,
  User,
  UserRole,
} from '@glaszetter/shared';

// Raw snake_case row shapes as returned by `pg`, and mappers to the
// camelCase domain types used across the app.

export interface CompanyRow {
  id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  iban: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapCompanyRow = (row: CompanyRow): Company => ({
  id: row.id,
  name: row.name,
  taxId: row.tax_id ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  address: row.address ?? undefined,
  city: row.city ?? undefined,
  postalCode: row.postal_code ?? undefined,
  country: row.country ?? undefined,
  iban: row.iban ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface UserRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export const mapUserRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  companyId: row.company_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface CustomerRow {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapCustomerRow = (row: CustomerRow): Customer => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  email: row.email ?? undefined,
  phone: row.phone ?? undefined,
  address: row.address ?? undefined,
  city: row.city ?? undefined,
  postalCode: row.postal_code ?? undefined,
  country: row.country ?? undefined,
  taxId: row.tax_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface ProjectRow {
  id: string;
  company_id: string;
  customer_id: string;
  name: string;
  address: string | null;
  city: string | null;
  description: string | null;
  status: ProjectStatus;
  created_at: Date;
  updated_at: Date;
}

export const mapProjectRow = (row: ProjectRow): Project => ({
  id: row.id,
  companyId: row.company_id,
  customerId: row.customer_id,
  name: row.name,
  address: row.address ?? undefined,
  city: row.city ?? undefined,
  description: row.description ?? undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface JobRow {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  status: JobStatus;
  due_date: Date | null;
  team_id: string | null;
  scheduled_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapJobRow = (row: JobRow): Job => ({
  id: row.id,
  companyId: row.company_id,
  projectId: row.project_id,
  name: row.name,
  status: row.status,
  dueDate: row.due_date ?? undefined,
  teamId: row.team_id ?? undefined,
  scheduledDate: row.scheduled_date ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface ElementRow {
  id: string;
  company_id: string;
  job_id: string;
  project_id: string;
  code: string;
  type: ElementType;
  location: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapElementRow = (row: ElementRow): Element => ({
  id: row.id,
  jobId: row.job_id,
  projectId: row.project_id,
  code: row.code,
  type: row.type,
  location: row.location ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface MeasurementRow {
  id: string;
  company_id: string;
  element_id: string;
  job_id: string;
  width: string;
  height: string;
  glass_type: string | null;
  notes: string | null;
  photos: string[];
  voice_memos: string[];
  status: MeasurementStatus;
  created_at: Date;
  updated_at: Date;
}

export const mapMeasurementRow = (row: MeasurementRow): Measurement => ({
  id: row.id,
  elementId: row.element_id,
  jobId: row.job_id,
  width: parseFloat(row.width),
  height: parseFloat(row.height),
  glassType: row.glass_type ?? undefined,
  notes: row.notes ?? undefined,
  photos: row.photos.length > 0 ? row.photos : undefined,
  voiceMemos: row.voice_memos.length > 0 ? row.voice_memos : undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface PhotoRow {
  id: string;
  company_id: string;
  job_id: string | null;
  element_id: string | null;
  storage_key: string;
  url: string;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapPhotoRow = (row: PhotoRow): Photo => ({
  id: row.id,
  companyId: row.company_id,
  jobId: row.job_id ?? undefined,
  elementId: row.element_id ?? undefined,
  url: row.url,
  originalFilename: row.original_filename ?? undefined,
  contentType: row.content_type ?? undefined,
  sizeBytes: row.size_bytes ?? undefined,
  caption: row.caption ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface TeamRow {
  id: string;
  company_id: string;
  name: string;
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapTeamRow = (row: TeamRow, memberIds: string[]): Team => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  color: row.color ?? undefined,
  memberIds,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface QuoteLineRow {
  id: string;
  quote_id: string;
  element_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
}

export const mapQuoteLineRow = (row: QuoteLineRow): QuoteLine => ({
  id: row.id,
  quoteId: row.quote_id,
  elementId: row.element_id ?? undefined,
  description: row.description,
  quantity: parseFloat(row.quantity),
  unitPrice: parseFloat(row.unit_price),
});

export interface QuoteRow {
  id: string;
  company_id: string;
  job_id: string;
  project_id: string;
  quote_number: string;
  status: QuoteStatus;
  vat_rate: string;
  valid_until: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const roundMoney = (amount: number): number => Math.round(amount * 100) / 100;

export const mapQuoteRow = (row: QuoteRow, lines: QuoteLine[]): Quote => {
  const vatRate = parseFloat(row.vat_rate);
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const vatAmount = roundMoney(subtotal * (vatRate / 100));

  return {
    id: row.id,
    companyId: row.company_id,
    jobId: row.job_id,
    projectId: row.project_id,
    quoteNumber: row.quote_number,
    status: row.status,
    vatRate,
    validUntil: row.valid_until ?? undefined,
    notes: row.notes ?? undefined,
    lines,
    subtotal,
    vatAmount,
    total: roundMoney(subtotal + vatAmount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  element_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
}

export const mapInvoiceLineRow = (row: InvoiceLineRow): InvoiceLine => ({
  id: row.id,
  invoiceId: row.invoice_id,
  elementId: row.element_id ?? undefined,
  description: row.description,
  quantity: parseFloat(row.quantity),
  unitPrice: parseFloat(row.unit_price),
});

export interface InvoiceRow {
  id: string;
  company_id: string;
  job_id: string;
  project_id: string;
  quote_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  vat_rate: string;
  due_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mapInvoiceRow = (row: InvoiceRow, lines: InvoiceLine[]): Invoice => {
  const vatRate = parseFloat(row.vat_rate);
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const vatAmount = roundMoney(subtotal * (vatRate / 100));

  return {
    id: row.id,
    companyId: row.company_id,
    jobId: row.job_id,
    projectId: row.project_id,
    quoteId: row.quote_id ?? undefined,
    invoiceNumber: row.invoice_number,
    status: row.status,
    vatRate,
    dueDate: row.due_date ?? undefined,
    notes: row.notes ?? undefined,
    lines,
    subtotal,
    vatAmount,
    total: roundMoney(subtotal + vatAmount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
