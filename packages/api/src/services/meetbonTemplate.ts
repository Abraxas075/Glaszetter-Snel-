import path from 'node:path';
import type {} from 'pdfkit';
import type { Meetbon } from '@glaszetter/shared';
import layout from './meetbonTemplateLayout.json';

export interface MeetbonOverflow { label: string; value: string; }
const clean = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

// Coordinates shared with the separate fillable form. Values that do not fit
// are preserved in an appendix, never silently shortened or discarded.
export function drawMeetbonTemplate(doc: PDFKit.PDFDocument, data: Meetbon, metadata: string): MeetbonOverflow[] {
  const overflow: MeetbonOverflow[] = [];
  const write = (value: string, x: number, y: number, w: number, size = 8, bold = false) => {
    doc.font(bold ? 'Bold' : 'Regular').fontSize(size).fillColor('#111').text(clean(value), x, y, { width: w, lineBreak: false });
  };
  const cell = (label: string, value: string, x: number, y: number, w: number, h: number, size = 9) => {
    const text = clean(value);
    doc.font('Regular').fontSize(size);
    const fits = doc.heightOfString(text, { width: w - 6, lineGap: 0 }) <= h - 3;
    if (!fits) overflow.push({ label, value: text });
    doc.fillColor('#111').text(fits ? text : 'Zie bijlage', x + 3, y + 2, { width: w - 6, height: h - 3, lineGap: 0 });
  };
  doc.image(path.join(__dirname, '../../assets/images/glaszetter-snel-logo.png'), 324, 18, { fit: [247, 116], align: 'center' });
  for (const t of layout.texts) write(t.text, t.x, t.y, t.w, t.size, t.bold);
  cell('Klus, project en opslagdatum', metadata, 24, 134, 547, 14, 6.5);
  for (const f of layout.fields) {
    doc.save().strokeColor('#777').lineWidth(0.5).dash(1, { space: 2 }).moveTo(f.x, f.y + f.h).lineTo(f.x + f.w, f.y + f.h).stroke().restore();
    cell(f.label.replace(/:$/, ''), data.fields[f.key] || '', f.x, f.y, f.w, f.h);
  }
  for (const c of layout.checks) {
    doc.save().strokeColor('#333').lineWidth(0.7).rect(c.x, c.y + 1, 10, 10).stroke();
    if (data.checks[c.key]) doc.moveTo(c.x + 2, c.y + 6).lineTo(c.x + 4.5, c.y + 9).lineTo(c.x + 9, c.y + 2.5).stroke();
    doc.restore();
    write(c.label, c.x + 14, c.y, c.w - 14, 8);
  }
  const { x, y, widths, headerHeight, rowHeight, rows } = layout.table;
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);
  doc.save().fillColor('#eef2f4').rect(x, y, totalWidth, headerHeight).fill();
  doc.strokeColor('#222').lineWidth(0.6).rect(x, y, totalWidth, headerHeight + rows * rowHeight).stroke();
  let column = x;
  for (const w of widths.slice(0, -1)) { column += w; doc.moveTo(column, y).lineTo(column, y + headerHeight + rows * rowHeight).stroke(); }
  for (let i = 0; i <= rows; i++) doc.moveTo(x, y + headerHeight + i * rowHeight).lineTo(x + totalWidth, y + headerHeight + i * rowHeight).stroke();
  doc.restore();
  write('AANTAL', x + 3, y + 7, widths[0] - 6, 6.4, true);
  write('BREEDTE × HOOGTE (mm)', x + widths[0] + 7, y + 7, widths[1] - 14, 8, true);
  write('SOORT GLAS & OPMERKING', x + widths[0] + widths[1] + 7, y + 7, widths[2] - 14, 8, true);
  for (const [i, line] of data.lines.entries()) {
    const glass = [line.glassType, line.glassThickness].filter(Boolean).join(' | ') || '-';
    const values = [String(line.quantity), `${line.width} × ${line.height}`, `${glass}${line.notes ? ' | ' + line.notes : ''}`];
    if (i >= rows) {
      overflow.push({ label: `Ruit ${i + 1}`, value: `Aantal: ${line.quantity} | Breedte: ${line.width} mm | Hoogte: ${line.height} mm\nSoort glas: ${glass}\nOpmerking: ${line.notes || '-'}` });
      continue;
    }
    let cellX = x;
    const before = overflow.length;
    values.forEach((v, j) => { cell(`Ruit ${i + 1}`, v, cellX, y + headerHeight + i * rowHeight, widths[j], rowHeight, 9); cellX += widths[j]; });
    if (overflow.length > before) {
      overflow.splice(before);
      overflow.push({ label: `Ruit ${i + 1}`, value: `Aantal: ${line.quantity} | Breedte: ${line.width} mm | Hoogte: ${line.height} mm\nSoort glas: ${glass}\nOpmerking: ${line.notes || '-'}` });
    }
  }
  const area = data.lines.reduce((sum, line) => sum + line.quantity * line.width * line.height / 1e6, 0).toLocaleString('nl-NL', { maximumFractionDigits: 3 });
  write(`Totaal: ${data.lines.reduce((sum, line) => sum + line.quantity, 0)} ruiten - ${area} m²`, 211, 802, 360, 9, true);
  write(data.lines.length ? 'Bonregels staan los van ingemeten elementen en bestellingen.' : 'Geen ruiten ingevuld.', 24, 824, 547, 6.5);
  doc.x = 44; doc.y = 88;
  return overflow;
}
