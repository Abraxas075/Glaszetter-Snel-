import { type Prim, SHEET_H, SHEET_W } from './sheet';

const PT = 0.3528; // 1 pt in mm

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Zet de tekenprimitieven om naar een SVG-string (voor voorvertoning en tests). */
export function primsToSvg(prims: Prim[]): string {
  const out: string[] = [];
  for (const p of prims) {
    if (p.t === 'rect') {
      out.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw ?? 0.2}"` : ''}${p.dash ? ` stroke-dasharray="${p.dash.join(' ')}"` : ''}/>`);
    } else if (p.t === 'line') {
      out.push(`<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${p.stroke}" stroke-width="${p.sw}"${p.dash ? ` stroke-dasharray="${p.dash.join(' ')}"` : ''}/>`);
    } else if (p.t === 'circle') {
      out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw ?? 0.2}"` : ''}/>`);
    } else {
      out.push(`<text x="${p.x}" y="${p.y}" font-size="${(p.size * PT).toFixed(3)}" font-family="Helvetica, Arial, sans-serif" font-weight="${p.bold ? 700 : 400}" text-anchor="${p.anchor ?? 'start'}" fill="${p.fill ?? '#111'}">${esc(p.s)}</text>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHEET_W} ${SHEET_H}" width="${SHEET_W}mm" height="${SHEET_H}mm"><rect width="${SHEET_W}" height="${SHEET_H}" fill="#fff"/>${out.join('')}</svg>`;
}
