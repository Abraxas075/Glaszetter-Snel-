import type { Invoice, InvoiceLine, InvoiceStatus } from '@glaszetter/shared';
import { pool } from '../db/pool';
import {
  mapInvoiceLineRow,
  mapInvoiceRow,
  type InvoiceLineRow,
  type InvoiceRow,
} from '../db/rows';
import { NotFoundError } from '../errors';
import { getJob } from './jobService';
import { getElement } from './elementService';

export interface InvoiceInput {
  jobId: string;
  status?: InvoiceStatus;
  vatRate?: number;
  dueDate?: string;
  notes?: string;
}

export interface InvoiceLineInput {
  elementId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
}

const generateInvoiceNumber = async (companyId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `FACT-${year}-`;
  const result = await pool.query<{ invoice_number: string }>(
    `SELECT invoice_number FROM invoices
     WHERE company_id = $1 AND invoice_number LIKE $2
     ORDER BY invoice_number DESC LIMIT 1`,
    [companyId, `${prefix}%`]
  );
  const last = result.rows[0]
    ? parseInt(result.rows[0].invoice_number.slice(prefix.length), 10)
    : 0;
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
};

const getLinesForInvoices = async (invoiceIds: string[]): Promise<Map<string, InvoiceLine[]>> => {
  if (invoiceIds.length === 0) return new Map();
  const result = await pool.query<InvoiceLineRow>(
    'SELECT * FROM invoice_lines WHERE invoice_id = ANY($1::uuid[]) ORDER BY created_at ASC',
    [invoiceIds]
  );
  const map = new Map<string, InvoiceLine[]>();
  for (const row of result.rows) {
    const line = mapInvoiceLineRow(row);
    const existing = map.get(row.invoice_id) ?? [];
    existing.push(line);
    map.set(row.invoice_id, existing);
  }
  return map;
};

export const listInvoices = async (
  companyId: string,
  filters: { jobId?: string } = {}
): Promise<Invoice[]> => {
  const conditions = ['company_id = $1'];
  const params: unknown[] = [companyId];

  if (filters.jobId) {
    params.push(filters.jobId);
    conditions.push(`job_id = $${params.length}`);
  }

  const result = await pool.query<InvoiceRow>(
    `SELECT * FROM invoices WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  const lineMap = await getLinesForInvoices(result.rows.map((row) => row.id));
  return result.rows.map((row) => mapInvoiceRow(row, lineMap.get(row.id) ?? []));
};

export const getInvoice = async (companyId: string, id: string): Promise<Invoice> => {
  const result = await pool.query<InvoiceRow>(
    'SELECT * FROM invoices WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Invoice');
  const lineMap = await getLinesForInvoices([row.id]);
  return mapInvoiceRow(row, lineMap.get(row.id) ?? []);
};

export const createInvoice = async (companyId: string, input: InvoiceInput): Promise<Invoice> => {
  const job = await getJob(companyId, input.jobId);
  const invoiceNumber = await generateInvoiceNumber(companyId);

  const result = await pool.query<InvoiceRow>(
    `INSERT INTO invoices (company_id, job_id, project_id, invoice_number, status, vat_rate, due_date, notes)
     VALUES ($1, $2, $3, $4, COALESCE($5::invoice_status, 'concept'), COALESCE($6, 21), $7, $8)
     RETURNING *`,
    [
      companyId,
      job.id,
      job.projectId,
      invoiceNumber,
      input.status ?? null,
      input.vatRate ?? null,
      input.dueDate ?? null,
      input.notes ?? null,
    ]
  );
  return mapInvoiceRow(result.rows[0], []);
};

export const updateInvoice = async (
  companyId: string,
  id: string,
  input: Partial<InvoiceInput>
): Promise<Invoice> => {
  const existing = await getInvoice(companyId, id);

  const result = await pool.query<InvoiceRow>(
    `UPDATE invoices SET
       status = COALESCE($3::invoice_status, status),
       vat_rate = COALESCE($4, vat_rate),
       due_date = COALESCE($5, due_date),
       notes = COALESCE($6, notes),
       updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [
      id,
      companyId,
      input.status ?? null,
      input.vatRate ?? null,
      input.dueDate ?? null,
      input.notes ?? null,
    ]
  );
  return mapInvoiceRow(result.rows[0], existing.lines);
};

export const deleteInvoice = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM invoices WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  if (result.rowCount === 0) throw new NotFoundError('Invoice');
};

export const addInvoiceLine = async (
  companyId: string,
  invoiceId: string,
  input: InvoiceLineInput
): Promise<InvoiceLine> => {
  const invoice = await getInvoice(companyId, invoiceId);

  if (input.elementId) {
    const element = await getElement(companyId, input.elementId);
    if (element.jobId !== invoice.jobId) throw new NotFoundError('Element');
  }

  const result = await pool.query<InvoiceLineRow>(
    `INSERT INTO invoice_lines (invoice_id, element_id, description, quantity, unit_price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      invoiceId,
      input.elementId ?? null,
      input.description,
      input.quantity ?? 1,
      input.unitPrice,
    ]
  );
  return mapInvoiceLineRow(result.rows[0]);
};

export const deleteInvoiceLine = async (
  companyId: string,
  invoiceId: string,
  lineId: string
): Promise<void> => {
  await getInvoice(companyId, invoiceId); // ensures existence + tenant ownership
  const result = await pool.query(
    'DELETE FROM invoice_lines WHERE id = $1 AND invoice_id = $2',
    [lineId, invoiceId]
  );
  if (result.rowCount === 0) throw new NotFoundError('Invoice line');
};
