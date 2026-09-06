import type { Quote, QuoteLine, QuoteStatus } from '@glaszetter/shared';
import { pool } from '../db/pool';
import {
  mapQuoteLineRow,
  mapQuoteRow,
  type QuoteLineRow,
  type QuoteRow,
} from '../db/rows';
import { NotFoundError } from '../errors';
import { getJob } from './jobService';
import { getElement } from './elementService';

export interface QuoteInput {
  jobId: string;
  status?: QuoteStatus;
  vatRate?: number;
  validUntil?: string;
  notes?: string;
}

export interface QuoteLineInput {
  elementId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
}

export class QuoteNotApprovedError extends Error {
  constructor() {
    super('Only an approved quote can be converted to an invoice');
    this.name = 'QuoteNotApprovedError';
  }
}

const generateQuoteNumber = async (companyId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `OFF-${year}-`;
  const result = await pool.query<{ quote_number: string }>(
    `SELECT quote_number FROM quotes
     WHERE company_id = $1 AND quote_number LIKE $2
     ORDER BY quote_number DESC LIMIT 1`,
    [companyId, `${prefix}%`]
  );
  const last = result.rows[0] ? parseInt(result.rows[0].quote_number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
};

const getLinesForQuotes = async (quoteIds: string[]): Promise<Map<string, QuoteLine[]>> => {
  if (quoteIds.length === 0) return new Map();
  const result = await pool.query<QuoteLineRow>(
    'SELECT * FROM quote_lines WHERE quote_id = ANY($1::uuid[]) ORDER BY created_at ASC',
    [quoteIds]
  );
  const map = new Map<string, QuoteLine[]>();
  for (const row of result.rows) {
    const line = mapQuoteLineRow(row);
    const existing = map.get(row.quote_id) ?? [];
    existing.push(line);
    map.set(row.quote_id, existing);
  }
  return map;
};

export const listQuotes = async (
  companyId: string,
  filters: { jobId?: string } = {}
): Promise<Quote[]> => {
  const conditions = ['company_id = $1'];
  const params: unknown[] = [companyId];

  if (filters.jobId) {
    params.push(filters.jobId);
    conditions.push(`job_id = $${params.length}`);
  }

  const result = await pool.query<QuoteRow>(
    `SELECT * FROM quotes WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  const lineMap = await getLinesForQuotes(result.rows.map((row) => row.id));
  return result.rows.map((row) => mapQuoteRow(row, lineMap.get(row.id) ?? []));
};

export const getQuote = async (companyId: string, id: string): Promise<Quote> => {
  const result = await pool.query<QuoteRow>(
    'SELECT * FROM quotes WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Quote');
  const lineMap = await getLinesForQuotes([row.id]);
  return mapQuoteRow(row, lineMap.get(row.id) ?? []);
};

export const createQuote = async (companyId: string, input: QuoteInput): Promise<Quote> => {
  const job = await getJob(companyId, input.jobId);
  const quoteNumber = await generateQuoteNumber(companyId);

  const result = await pool.query<QuoteRow>(
    `INSERT INTO quotes (company_id, job_id, project_id, quote_number, status, vat_rate, valid_until, notes)
     VALUES ($1, $2, $3, $4, COALESCE($5::quote_status, 'concept'), COALESCE($6, 21), $7, $8)
     RETURNING *`,
    [
      companyId,
      job.id,
      job.projectId,
      quoteNumber,
      input.status ?? null,
      input.vatRate ?? null,
      input.validUntil ?? null,
      input.notes ?? null,
    ]
  );
  return mapQuoteRow(result.rows[0], []);
};

export const updateQuote = async (
  companyId: string,
  id: string,
  input: Partial<QuoteInput>
): Promise<Quote> => {
  const existing = await getQuote(companyId, id);

  const result = await pool.query<QuoteRow>(
    `UPDATE quotes SET
       status = COALESCE($3::quote_status, status),
       vat_rate = COALESCE($4, vat_rate),
       valid_until = COALESCE($5, valid_until),
       notes = COALESCE($6, notes),
       updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [
      id,
      companyId,
      input.status ?? null,
      input.vatRate ?? null,
      input.validUntil ?? null,
      input.notes ?? null,
    ]
  );
  return mapQuoteRow(result.rows[0], existing.lines);
};

export const deleteQuote = async (companyId: string, id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM quotes WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  if (result.rowCount === 0) throw new NotFoundError('Quote');
};

export const addQuoteLine = async (
  companyId: string,
  quoteId: string,
  input: QuoteLineInput
): Promise<QuoteLine> => {
  const quote = await getQuote(companyId, quoteId);

  if (input.elementId) {
    const element = await getElement(companyId, input.elementId);
    if (element.jobId !== quote.jobId) throw new NotFoundError('Element');
  }

  const result = await pool.query<QuoteLineRow>(
    `INSERT INTO quote_lines (quote_id, element_id, description, quantity, unit_price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      quoteId,
      input.elementId ?? null,
      input.description,
      input.quantity ?? 1,
      input.unitPrice,
    ]
  );
  return mapQuoteLineRow(result.rows[0]);
};

export const deleteQuoteLine = async (
  companyId: string,
  quoteId: string,
  lineId: string
): Promise<void> => {
  await getQuote(companyId, quoteId); // ensures existence + tenant ownership
  const result = await pool.query(
    'DELETE FROM quote_lines WHERE id = $1 AND quote_id = $2',
    [lineId, quoteId]
  );
  if (result.rowCount === 0) throw new NotFoundError('Quote line');
};

export const convertQuoteToInvoice = async (
  companyId: string,
  quoteId: string
): Promise<{ invoiceId: string }> => {
  const quote = await getQuote(companyId, quoteId);
  if (quote.status !== 'approved') throw new QuoteNotApprovedError();

  const year = new Date().getFullYear();
  const prefix = `FACT-${year}-`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const numberResult = await client.query<{ invoice_number: string }>(
      `SELECT invoice_number FROM invoices
       WHERE company_id = $1 AND invoice_number LIKE $2
       ORDER BY invoice_number DESC LIMIT 1`,
      [companyId, `${prefix}%`]
    );
    const last = numberResult.rows[0]
      ? parseInt(numberResult.rows[0].invoice_number.slice(prefix.length), 10)
      : 0;
    const invoiceNumber = `${prefix}${String(last + 1).padStart(4, '0')}`;

    const invoiceResult = await client.query<{ id: string }>(
      `INSERT INTO invoices (company_id, job_id, project_id, quote_id, invoice_number, status, vat_rate, notes)
       VALUES ($1, $2, $3, $4, $5, 'concept', $6, $7)
       RETURNING id`,
      [companyId, quote.jobId, quote.projectId, quote.id, invoiceNumber, quote.vatRate, quote.notes ?? null]
    );
    const invoiceId = invoiceResult.rows[0].id;

    for (const line of quote.lines) {
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, element_id, description, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [invoiceId, line.elementId ?? null, line.description, line.quantity, line.unitPrice]
      );
    }

    await client.query('COMMIT');
    return { invoiceId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
