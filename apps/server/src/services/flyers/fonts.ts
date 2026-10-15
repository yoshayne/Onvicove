import path from 'path';
import { Resvg } from '@resvg/resvg-js';

/** Bundled fonts (SIL Open Font License): servers have no fonts of their own, so text is always drawn with these. */
const DIR = path.resolve(__dirname, '../../../assets/fonts');
export const FONT_FILES = [
  'Anton_400Regular.ttf',
  'PlayfairDisplay_700Bold.ttf',
  'Montserrat_400Regular.ttf',
  'Montserrat_600SemiBold.ttf',
  'Montserrat_800ExtraBold.ttf',
].map((f) => path.join(DIR, f));

export const RESVG_FONT = { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Montserrat' };

export interface FontSpec {
  family: 'Anton' | 'Playfair Display' | 'Montserrat';
  weight: 400 | 600 | 700 | 800;
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Width in pixels of a line of text (measured by drawing it with the real font) */
export function measureText(text: string, font: FontSpec, size: number, spacing = 0): number {
  if (!text) return 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="600"><text x="0" y="400" font-family="${font.family}" font-weight="${font.weight}" font-size="${size}" letter-spacing="${spacing}">${esc(text)}</text></svg>`;
  const box = new Resvg(svg, { font: RESVG_FONT }).getBBox();
  return box ? box.width : 0;
}

/** Largest font size (down to `min`) at which the text fits on one line */
export function fitSize(text: string, font: FontSpec, maxWidth: number, start: number, min: number, spacing = 0): number {
  let size = start;
  while (size > min && measureText(text, font, size, spacing) > maxWidth) size -= 2;
  return size;
}

/** Break text into at most `maxLines` lines that fit; the size shrinks if needed. Returns null if it cannot fit. */
export function wrapToFit(text: string, font: FontSpec, maxWidth: number, start: number, min: number, maxLines: number, spacing = 0): { lines: string[]; size: number } {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = start; size >= min; size -= 2) {
    const lines: string[] = [];
    let cur = '';
    let ok = true;
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (measureText(t, font, size, spacing) <= maxWidth) cur = t;
      else if (!cur) { ok = false; break; } // a single word is too wide at this size
      else { lines.push(cur); cur = w; }
    }
    if (ok) {
      if (cur) lines.push(cur);
      if (lines.length <= maxLines) return { lines, size };
    }
  }
  return { lines: [words.join(' ')], size: min };
}
