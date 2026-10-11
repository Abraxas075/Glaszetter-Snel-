import { type Prim, SHEET_H, SHEET_W } from './sheet';

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Standaard-PDF-lettertypen kennen geen ′ (priemteken). */
const pdfText = (s: string) => s.replace(/′/g, "'");

/** Tekent de jaarkalender (A4 liggend) in een jsPDF-document. jsPDF wordt pas geladen wanneer het nodig is. */
export async function buildPdf(prims: Prim[], title: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [SHEET_H, SHEET_W] });
  doc.setProperties({ title, subject: 'Maanfase Vruchtbaarheid Kalender', creator: 'Maanfase Cyclus' });

  for (const p of prims) {
    if (p.t === 'text') {
      doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
      doc.setFontSize(p.size);
      doc.setTextColor(...rgb(p.fill ?? '#111111'));
      doc.text(pdfText(p.s), p.x, p.y, { align: p.anchor === 'middle' ? 'center' : p.anchor === 'end' ? 'right' : 'left' });
      continue;
    }
    if (p.t === 'line') {
      doc.setDrawColor(...rgb(p.stroke));
      doc.setLineWidth(p.sw);
      doc.setLineDashPattern(p.dash ?? [], 0);
      doc.line(p.x1, p.y1, p.x2, p.y2);
      continue;
    }
    const style = p.fill && p.stroke ? 'FD' : p.fill ? 'F' : p.stroke ? 'S' : null;
    if (!style) continue;
    if (p.fill) doc.setFillColor(...rgb(p.fill));
    if (p.stroke) {
      doc.setDrawColor(...rgb(p.stroke));
      doc.setLineWidth(p.sw ?? 0.2);
    }
    doc.setLineDashPattern(p.t === 'rect' ? (p.dash ?? []) : [], 0);
    if (p.t === 'rect') doc.rect(p.x, p.y, p.w, p.h, style);
    else doc.circle(p.cx, p.cy, p.r, style);
  }
  doc.setLineDashPattern([], 0);
  return doc;
}

export async function downloadPdf(prims: Prim[], filename: string, title: string) {
  const doc = await buildPdf(prims, title);
  doc.save(filename);
}
