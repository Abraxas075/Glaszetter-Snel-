import PDFDocument from 'pdfkit';
import path from 'node:path';
import { MEETBON_SECTIONS, type Company, type Job, type Meetbon, type Project } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { NotFoundError } from '../errors';
import { getJob } from './jobService';
import { getCompany } from './companyService';
import { getProject } from './projectService';
import { readFromBucket } from './s3Client';

export interface MeetbonPdfPhoto {
  storageKey: string;
  contentType: string | null;
  caption: string | null;
  filename: string | null;
  elementCode: string | null;
}
export interface MeetbonPdfInput {
  company: Company;
  project: Project;
  job: Job;
  data: Meetbon;
  updatedAt: Date;
  photos: MeetbonPdfPhoto[];
}

export async function getMeetbonPdfInput(companyId: string, jobId: string): Promise<MeetbonPdfInput> {
  const job = await getJob(companyId, jobId);
  const saved = await pool.query<{ data: Meetbon; updated_at: Date }>(
    'SELECT data, updated_at FROM meetbons WHERE job_id = $1', [jobId]
  );
  if (!saved.rows[0]) throw new NotFoundError('Meetbon');
  const [company, project, photos] = await Promise.all([
    getCompany(companyId),
    getProject(companyId, job.projectId),
    pool.query<MeetbonPdfPhoto>(
      `SELECT p.storage_key AS "storageKey", p.content_type AS "contentType",
              p.caption, p.original_filename AS filename, e.code AS "elementCode"
       FROM photos p
       LEFT JOIN elements e ON e.id = p.element_id AND e.company_id = p.company_id
       WHERE p.company_id = $1 AND (p.job_id = $2 OR e.job_id = $2)
       ORDER BY p.created_at, p.id`, [companyId, jobId]
    ),
  ]);
  return { company, project, job, data: saved.rows[0].data, updatedAt: saved.rows[0].updated_at, photos: photos.rows };
}

// The finished buffer is returned before HTTP headers are sent, so render failures
// still produce a normal API error rather than a broken download.
export async function generateMeetbonPdf(
  input: MeetbonPdfInput,
  loadPhoto: (key: string) => Promise<Buffer> = readFromBucket
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 88, bottom: 54, left: 44, right: 44 },
    info: { Title: `Meetbon - ${input.job.name}`, Author: input.company.name } });
  const chunks: Buffer[] = [];
  doc.registerFont('Regular', path.join(__dirname, '../../assets/fonts/DejaVuSans.ttf'));
  doc.registerFont('Bold', path.join(__dirname, '../../assets/fonts/DejaVuSans-Bold.ttf'));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  let page = 0;
  const width = doc.page.width - 88;
  const clean = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const header = () => {
    page++;
    doc.save().rect(0, 0, doc.page.width, 8).fill('#d52d36');
    doc.font('Bold').fontSize(18).fillColor('#173e75').text('DIGITALE MEETBON', 44, 28, { lineBreak: false });
    doc.font('Regular').fontSize(9).fillColor('#555').text(clean(input.company.name), 44, 53, { width, height: 15, ellipsis: true });
    doc.fontSize(8).text(`Pagina ${page}`, 44, doc.page.height - 35, { lineBreak: false });
    doc.restore();
    doc.font('Regular').fontSize(10).fillColor('#222');
    doc.x = 44; doc.y = 88;
  };
  header(); doc.on('pageAdded', header);
  const space = (height: number) => { if (doc.y + height > doc.page.height - 54) doc.addPage(); };
  const text = (value: string) => { doc.font('Regular').fontSize(10).fillColor('#222').text(clean(value), 44, doc.y, { width, lineGap: 3 }); };
  const heading = (value: string) => {
    space(58); doc.moveDown(0.7);
    doc.font('Bold').fontSize(13).fillColor('#173e75').text(value, 44, doc.y, { width });
    doc.moveDown(0.35);
  };
  try {
    text(`Klus: ${input.job.name}\nProject: ${input.project.name}`);
    text(`Opgeslagen: ${new Date(input.updatedAt).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })} (Nederlandse tijd)`);
    for (const section of MEETBON_SECTIONS) {
      heading(section.title);
      for (const field of section.fields) { space(30); text(`${field.label}: ${input.data.fields[field.key]?.trim() || '-'}`); }
      if (section.checks.length) text(section.checks.map(check => `${check.label}: ${input.data.checks[check.key] ? 'Ja' : 'Nee'}`).join('   |   '));
    }
    heading('Ruiten');
    const area = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 3 });
    if (!input.data.lines.length) text('Geen ruiten ingevuld.');
    input.data.lines.forEach((line, index) => {
      space(78);
      doc.font('Bold').fontSize(11).fillColor('#173e75').text(`Ruit ${index + 1}`, 44, doc.y);
      text(`Aantal: ${line.quantity}  |  Breedte: ${line.width} mm  |  Hoogte: ${line.height} mm`);
      text(`Oppervlak inclusief aantal: ${area(line.quantity * line.width * line.height / 1e6)} m²`);
      text(`Soort glas: ${line.glassType || '-'}\nOpmerking: ${line.notes || '-'}`);
      doc.moveDown(0.5);
    });
    space(60);
    text(`Totaal: ${input.data.lines.reduce((n, l) => n + l.quantity, 0)} ruiten - ${area(input.data.lines.reduce((n, l) => n + l.quantity * l.width * l.height / 1e6, 0))} m²`);
    text('Deze bonregels staan los van ingemeten elementen en bestellingen.');
    if (!input.photos.length) { heading('Foto’s bij de klus'); text('Geen foto’s opgeslagen bij deze klus.'); }
    let embeddedBytes = 0;
    for (const [index, photo] of input.photos.entries()) {
      // Every photo remains listed; limit embedded image bytes and downloads on
      // the free API instance. Missing or unsupported images are never silent.
      doc.addPage();
      if (index === 0) {
        heading('Foto’s bij de klus');
        text(`${input.photos.length} foto('s). Elementfoto’s zijn aangeduid met hun elementcode en staan los van meetbonregels.`);
      }
      heading(`Foto ${index + 1} - ${photo.elementCode ? `Element ${photo.elementCode}` : 'Klusfoto'}`);
      text(`Bestand: ${photo.filename || '-'}\nBijschrift: ${photo.caption || '-'}`);
      let reason = '';
      if (index >= 20 || embeddedBytes >= 30 * 1024 * 1024) reason = 'Niet ingesloten: limiet voor foto’s in deze PDF bereikt.';
      else if (!['image/jpeg', 'image/png'].includes(photo.contentType || '')) reason = 'Niet ingesloten: alleen JPG- en PNG-foto’s worden ondersteund.';
      else {
        try {
          const bytes = await loadPhoto(photo.storageKey);
          if (bytes.length + embeddedBytes > 30 * 1024 * 1024) reason = 'Niet ingesloten: limiet voor foto’s in deze PDF bereikt.';
          else {
            space(280);
            doc.image(bytes, 44, doc.y + 12, { fit: [width, 300], align: 'center' });
            embeddedBytes += bytes.length;
          }
        } catch { reason = 'Foto kon niet worden ingesloten. Controleer de foto in de app.'; }
      }
      if (reason) text(reason);
    }
    doc.end();
  } catch (error) { doc.destroy(error instanceof Error ? error : new Error('PDF generation failed')); }
  return finished;
}
