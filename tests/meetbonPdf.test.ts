import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import type { MeetbonPdfInput } from '../packages/api/src/services/meetbonPdfService';

let generateMeetbonPdf: typeof import('../packages/api/src/services/meetbonPdfService')['generateMeetbonPdf'];

const previousUrl = process.env.DATABASE_URL;
const previousSecret = process.env.JWT_SECRET;
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'disposable-meetbon-pdf-test-key';
const companyId = '00000000-0000-4000-8000-000000000001';
const otherCompanyId = '00000000-0000-4000-8000-000000000002';
const jobId = '00000000-0000-4000-8000-000000000003';
const unsavedJobId = '00000000-0000-4000-8000-000000000004';
const projectId = '00000000-0000-4000-8000-000000000005';
const date = new Date('2026-10-03T10:00:00Z');
const input: MeetbonPdfInput = {
  company: { id: companyId, name: 'Glaszetter Snel', createdAt: date, updatedAt: date },
  project: { id: projectId, companyId, customerId: companyId, name: 'Voorbeeldproject', status: 'active', createdAt: date, updatedAt: date },
  job: { id: jobId, companyId, projectId, name: 'Voorbeeldklus', status: 'measuring', createdAt: date, updatedAt: date },
  data: { fields: { name: 'Testklant', remarks: 'Laatste opmerking' }, checks: { g1c0: true }, lines: [{ quantity: 2, width: 875, height: 484, glassType: 'HR++', notes: 'Woonkamer' }] },
  updatedAt: date, photos: [],
};

// Parse the actual output, including embedded fonts and page boundaries.
async function pdfText(pdf: Buffer): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const parsed = await getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;
  let text = '';
  try {
    for (let i = 1; i <= parsed.numPages; i++) {
      const page = await parsed.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => 'str' in item ? item.str : '').join(' ');
    }
  } finally { await parsed.destroy(); }
  return text.replace(/\s+/g, ' ');
}

test('PDF contains saved fields, choices, measurements, quantity-aware area and final line after pagination', async () => {
  const many = { ...input, data: { ...input.data, lines: Array.from({ length: 200 }, (_, i) => ({ ...input.data.lines[0], notes: `Regel ${i + 1}: ${'lange tekst '.repeat(80)}` })) } };
  const pdf = await generateMeetbonPdf(many);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const text = await pdfText(pdf);
  for (const value of ['Testklant', 'Oud werk: Ja', 'Nieuw werk: Nee', 'Breedte: 875 mm', 'Hoogte: 484 mm', '0,847', 'HR++', 'Regel 200:', 'Totaal: 400 ruiten - 169,4']) assert.ok(text.includes(value), value);
  assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length > 2);
});

test('empty meetbon exports and unavailable, unsupported and capped photos are explicitly listed', async () => {
  const photos = Array.from({ length: 21 }, (_, i) => ({ storageKey: `test/${i}`, contentType: i === 0 ? 'image/heic' : 'image/jpeg', caption: null, filename: `foto-${i}.jpg`, elementCode: i === 1 ? 'R01' : null }));
  const calls: string[] = [];
  const pdf = await generateMeetbonPdf({ ...input, data: { fields: {}, checks: {}, lines: [] }, photos }, async key => { calls.push(key); throw new Error('Unavailable'); });
  const text = await pdfText(pdf);
  assert.ok(text.includes('Geen ruiten ingevuld.'));
  assert.ok(text.includes('alleen JPG- en PNG'));
  assert.ok(text.includes('Foto kon niet worden ingesloten'));
  assert.ok(text.includes('Element R01'));
  assert.ok(text.includes('foto-20.jpg'));
  assert.ok(text.includes('limiet voor'));
  assert.equal(calls.length, 19);
});

test('a supported PNG is embedded as an actual PDF image', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAAHUlEQVR4nGMUtytlIBcwka1zVPOo5lHNo5qpohkAJQYA8j9QnyQAAAAASUVORK5CYII=', 'base64');
  const photo = { storageKey: 'test/image', contentType: 'image/png', caption: 'Raamfoto', filename: 'raam.png', elementCode: 'R01' };
  const pdf = await generateMeetbonPdf({ ...input, photos: [photo] }, async key => { assert.equal(key, photo.storageKey); return png; });
  assert.ok(pdf.toString('latin1').includes('/Subtype /Image'));
  const text = await pdfText(pdf);
  assert.ok(text.includes('Raamfoto'));
  assert.ok(!text.includes('kon niet worden ingesloten'));
});

let db: PGlite;
let server: Server;
let origin: string;
let signToken: typeof import('../packages/api/src/services/authService')['signToken'];
let pool: typeof import('../packages/api/src/db/pool')['pool'];
before(async () => {
  ({ generateMeetbonPdf } = await import('../packages/api/src/services/meetbonPdfService'));
  db = new PGlite();
  await db.exec(`
    CREATE TABLE companies (id uuid PRIMARY KEY, name text);
    CREATE TABLE projects (id uuid PRIMARY KEY, company_id uuid, customer_id uuid, name text, status text);
    CREATE TABLE jobs (id uuid PRIMARY KEY, company_id uuid, project_id uuid, name text, status text);
    CREATE TABLE meetbons (job_id uuid PRIMARY KEY, data jsonb, updated_at timestamptz);
    CREATE TABLE elements (id uuid PRIMARY KEY, company_id uuid, job_id uuid, code text);
    CREATE TABLE photos (id uuid PRIMARY KEY, company_id uuid, job_id uuid, element_id uuid, storage_key text, content_type text, caption text, original_filename text, created_at timestamptz);
  `);
  await db.query('INSERT INTO companies VALUES ($1, $2)', [companyId, 'Glaszetter Snel']);
  await db.query("INSERT INTO projects VALUES ($1, $2, $2, 'Project', 'active')", [projectId, companyId]);
  for (const id of [jobId, unsavedJobId]) await db.query("INSERT INTO jobs VALUES ($1, $2, $3, 'Klus', 'measuring')", [id, companyId, projectId]);
  await db.query('INSERT INTO meetbons VALUES ($1, $2::jsonb, $3)', [jobId, JSON.stringify(input.data), date.toISOString()]);
  ({ pool } = await import('../packages/api/src/db/pool'));
  mock.method(pool, 'query', (sql: string, params: unknown[]) => db.query(sql, params));
  ({ signToken } = await import('../packages/api/src/services/authService'));
  const { jobsRouter } = await import('../packages/api/src/routes/jobs');
  const app = express(); app.use('/jobs', jobsRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server');
  origin = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  mock.restoreAll(); if (pool) await pool.end(); if (db) await db.close();
  if (previousUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousUrl;
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});

test('PDF endpoint requires authentication, rejects another company and an unsaved meetbon', async () => {
  const endpoint = `${origin}/jobs/${jobId}/meetbon/pdf`;
  assert.equal((await fetch(endpoint)).status, 401);
  const headers = (companyId: string) => ({ Authorization: `Bearer ${signToken({ userId: companyId, companyId, role: 'owner' })}` });
  assert.equal((await fetch(endpoint, { headers: headers(otherCompanyId) })).status, 404);
  assert.equal((await fetch(`${origin}/jobs/${unsavedJobId}/meetbon/pdf`, { headers: headers(companyId) })).status, 404);
  const response = await fetch(endpoint, { headers: headers(companyId) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
});

test('photo selection includes this job and its elements, excluding unrelated jobs and companies', async () => {
  const elementId = '00000000-0000-4000-8000-000000000010';
  await db.query("INSERT INTO elements VALUES ($1, $2, $3, 'R01')", [elementId, companyId, jobId]);
  for (const [id, owner, job, element] of [
    ['00000000-0000-4000-8000-000000000011', companyId, jobId, null],
    ['00000000-0000-4000-8000-000000000012', companyId, null, elementId],
    ['00000000-0000-4000-8000-000000000013', companyId, unsavedJobId, null],
    ['00000000-0000-4000-8000-000000000014', otherCompanyId, jobId, null],
  ]) await db.query("INSERT INTO photos (id, company_id, job_id, element_id, storage_key) VALUES ($1, $2, $3, $4, $5)", [id, owner, job, element, id]);
  const { getMeetbonPdfInput } = await import('../packages/api/src/services/meetbonPdfService');
  const data = await getMeetbonPdfInput(companyId, jobId);
  assert.equal(data.photos.length, 2);
  assert.equal(data.photos.filter(photo => photo.elementCode === 'R01').length, 1);
});
