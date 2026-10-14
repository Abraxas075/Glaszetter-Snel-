import PDFDocument from 'pdfkit';
import path from 'node:path';
import { formatDeliveryDate, isMeetbon, type Company, type Job, type Meetbon, type Project } from '@glaszetter/shared';
import { pool } from '../db/pool';
import { getJob } from './jobService';
import { getCompany } from './companyService';
import { getProject } from './projectService';

export interface OrderPdfInput { company: Company; project: Project; job: Job; data: Meetbon; updatedAt: Date; }
export async function getOrderPdfInput(companyId: string, jobId: string): Promise<OrderPdfInput> {
  const job = await getJob(companyId, jobId); // Verify company ownership before reading the meetbon.
  const result = await pool.query<{ data: Meetbon; updated_at: Date }>('SELECT data, updated_at FROM meetbons WHERE job_id = $1', [jobId]);
  const saved = result.rows[0];
  if (!saved || !isMeetbon(saved.data) || !saved.data.lines.length) {
    throw Object.assign(new Error('Sla eerst een meetbon met ruiten op bij deze klus voordat je een bestelbon maakt.'), { status: 422, code: 'ORDER_HAS_NO_LINES' });
  }
  const [company, project] = await Promise.all([getCompany(companyId), getProject(companyId, job.projectId)]);
  return { company, project, job, data: saved.data, updatedAt: saved.updated_at };
}

/** A supplier-facing export from saved pane lines; does not send an order or change job status. */
export async function generateOrderPdf(input: OrderPdfInput, generatedAt = new Date()): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `Bestelbon - ${input.job.name}`, Author: input.company.name } });
  doc.registerFont('Regular', path.join(__dirname, '../../assets/fonts/DejaVuSans.ttf'));
  doc.registerFont('Bold', path.join(__dirname, '../../assets/fonts/DejaVuSans-Bold.ttf'));
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const left = 40, width = doc.page.width - 80, bottom = 758, lineHeight = 13;
  const clean = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r/g, '');
  const number = (value: number) => String(value).replace('.', ',');
  const dateTime = (value: Date) => new Date(value).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short' });
  const wrapped = (value: string, available: number): string[] => {
    doc.font('Regular').fontSize(9);
    return clean(value).split('\n').flatMap(paragraph => {
      const lines: string[] = []; let current = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (doc.widthOfString(current ? `${current} ${word}` : word) <= available) { current = current ? `${current} ${word}` : word; continue; }
        if (current) { lines.push(current); current = ''; }
        for (const character of Array.from(word)) {
          if (current && doc.widthOfString(current + character) > available) { lines.push(current); current = ''; }
          current += character;
        }
      }
      lines.push(current); return lines;
    });
  };
  let y = 118;
  function header() {
    doc.save().rect(0, 0, doc.page.width, 6).fill('#E30613');
    doc.image(path.join(__dirname, '../../assets/images/glaszetter-snel-logo.png'), (doc.page.width - 180) / 2, 18, { fit: [180, 62], align: 'center' });
    doc.font('Bold').fontSize(20).fillColor('#173e75').text('BESTELBON', left, 86, { width, align: 'center', lineBreak: false });
    doc.restore(); y = 118;
  }
  function newPage() { doc.addPage(); header(); }
  function paragraph(label: string, value: string) {
    const lines = wrapped(`${label}: ${value}`, width);
    for (const line of lines) {
      if (y + lineHeight > bottom) newPage();
      doc.font('Regular').fontSize(9).fillColor('#222').text(line, left, y, { lineBreak: false }); y += lineHeight;
    }
    y += 4;
  }
  const columns = [30, 48, 67, 67, 130, width - 342];
  function tableHeader() {
    if (y + 30 > bottom) newPage();
    doc.save().rect(left, y, width, 27).fill('#173e75');
    const labels = ['Nr.', 'Aantal', 'Breedte', 'Hoogte', 'Glastype', 'Opmerkingen'];
    let x = left;
    labels.forEach((label, index) => {
      doc.font('Bold').fontSize(8).fillColor('#fff').text(label, x + 5, y + 5, { lineBreak: false });
      if (index === 2 || index === 3) doc.fontSize(7).text('(mm)', x + 5, y + 16, { lineBreak: false });
      x += columns[index];
    });
    doc.restore(); y += 27;
  }
  try {
    header();
    paragraph('Afzender', input.company.name);
    paragraph('Bestelnummer', input.job.orderNumber || 'Nog niet ingevuld');
    paragraph('Leverancier', input.job.supplierName || 'Nog niet ingevuld');
    paragraph('Verwachte leverdatum', formatDeliveryDate(input.job.deliveryDate));
    paragraph('Klus', input.job.name);
    paragraph('Project', input.project.name);
    if (input.project.address || input.project.city) paragraph('Projectadres', [input.project.address, input.project.city].filter(Boolean).join(', '));
    paragraph('Meetbon opgeslagen', `${dateTime(input.updatedAt)} (Nederlandse tijd)`);
    paragraph('PDF gemaakt', `${dateTime(generatedAt)} (Nederlandse tijd)`);
    y += 8; tableHeader();
    for (const [index, pane] of input.data.lines.entries()) {
      const cells = [String(index + 1), String(pane.quantity), number(pane.width), number(pane.height), pane.glassType || '-', pane.notes || '-'].map((text, column) => wrapped(text, columns[column] - 10));
      let offset = 0; const length = Math.max(...cells.map(lines => lines.length));
      while (offset < length) {
        if (y + lineHeight + 12 > bottom) { newPage(); tableHeader(); }
        const count = Math.min(length - offset, Math.floor((bottom - y - 12) / lineHeight));
        const height = count * lineHeight + 12;
        doc.save().rect(left, y, width, height).fill(index % 2 === 0 ? '#F1F5FA' : '#FFFFFF');
        let x = left;
        cells.forEach((lines, column) => {
          // On continuation pages repeat the pane number, never duplicate the quantity.
          const visible = lines.slice(offset, offset + count);
          if (offset && column === 0) visible[0] = `${index + 1}*`;
          visible.forEach((line, row) => doc.font('Regular').fontSize(9).fillColor('#222').text(line, x + 5, y + 6 + row * lineHeight, { lineBreak: false }));
          doc.lineWidth(0.4).strokeColor('#BCD0E3').moveTo(x, y).lineTo(x, y + height).stroke(); x += columns[column];
        });
        doc.rect(left, y, width, height).lineWidth(0.4).strokeColor('#BCD0E3').stroke().restore();
        y += height; offset += count;
      }
    }
    y += 14;
    const quantity = input.data.lines.reduce((sum, line) => sum + line.quantity, 0);
    const area = input.data.lines.reduce((sum, line) => sum + line.quantity * line.width * line.height / 1_000_000, 0);
    paragraph('Totaal', `${quantity} ruiten | ${area.toLocaleString('nl-NL', { maximumFractionDigits: 3 })} m² gemeten glasoppervlak`);
    paragraph('Toelichting', 'Maten in millimeters, overgenomen uit de opgeslagen meetbon. * betekent vervolg van dezelfde regel. Controleer maten, glastype en levergegevens voordat je bestelt.');
    const pages = doc.bufferedPageRange();
    for (let page = 0; page < pages.count; page++) {
      doc.switchToPage(page);
      doc.page.margins.bottom = 0; // Fixed footer must not trigger PDFKit automatic pagination.
      doc.moveTo(left, 784).lineTo(left + width, 784).lineWidth(0.7).strokeColor('#E30613').stroke();
      doc.font('Regular').fontSize(8).fillColor('#555').text(`Bestelbon | Pagina ${page + 1} van ${pages.count}`, left, 794, { width, align: 'right', lineBreak: false });
    }
    doc.end();
  } catch (error) { doc.destroy(error instanceof Error ? error : new Error('PDF maken is mislukt.')); }
  return finished;
}
