import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { buildCopy, classifyIndustry, drawable, familyForVariant, primaryFamily, type Family, type SaleKind } from './copy';
import { esc, fitSize, measureText, RESVG_FONT, wrapToFit, type FontSpec } from './fonts';

export type FlyerFormat = 'post' | 'story';
export const FLYER_SIZES: Record<FlyerFormat, { w: number; h: number }> = {
  post: { w: 1080, h: 1350 }, // 4:5, Instagram feed
  story: { w: 1080, h: 1920 }, // 9:16
};

export interface FlyerInput {
  company: string;
  kind: SaleKind;
  /** The product or service that was bought (shown only for sales) */
  itemName: string | null;
  industry: string | null;
  businessType: string | null;
  /** Names of what the store lists: helps tell what kind of business it is */
  listingNames: string[];
  brandColor: string | null;
  /** The store's real files: nothing is generated or redrawn */
  logo: Buffer | null;
  photo: Buffer | null;
  /** Public store address, shown only when we have one */
  url: string | null;
  /** The photo already carries the store's logo, so we don't add a second one */
  photoHasLogo?: boolean;
  /** 0 = the look chosen for this kind of business; 1, 2, 3 = the other layouts (used by "redo") */
  variant: number;
}

export interface FlyerResult {
  png: Buffer;
  family: Family;
  width: number;
  height: number;
  /** Lowest text/background contrast found over the photo (≥ 4.5 is comfortably readable) */
  contrast: number;
  usedPhoto: boolean;
  usedLogo: boolean;
}

// ── colour helpers ───────────────────────────────────────────────────────────
type RGB = [number, number, number];
const parseHex = (h: string | null | undefined): RGB | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec((h ?? '').trim());
  return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4), 16)] : null;
};
const toHex = (c: RGB) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const lum = (c: RGB) => {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const INK: RGB = [20, 18, 15];
const PAPER: RGB = [246, 243, 238];

/** The logo's own signature colour (its most saturated bright pixels), so a black-and-gold logo gives a gold accent */
async function logoColor(logo: Buffer | null): Promise<RGB | null> {
  if (!logo) return null;
  try {
    const { data, info } = await sharp(logo).resize(48, 48, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] < 200) continue;
      const mx = Math.max(data[i], data[i + 1], data[i + 2]);
      const mn = Math.min(data[i], data[i + 1], data[i + 2]);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      if (sat > 0.35 && mx > 90) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    }
    return n > 20 ? [r / n, g / n, b / n] : null;
  } catch {
    return null;
  }
}

/** Nudge a colour until it reads against the background */
function readable(c: RGB, bg: RGB, min: number): RGB {
  const target = lum(bg) < 0.4 ? WHITE : BLACK;
  let out = c;
  for (let i = 0; i < 12 && contrast(out, bg) < min; i++) out = mix(out, target, 0.15);
  return out;
}

// ── logo ─────────────────────────────────────────────────────────────────────
interface PreparedLogo { buf: Buffer; w: number; h: number }

/** Size the real logo; give it a plate only if it would otherwise disappear into the background */
async function prepareLogo(logo: Buffer, maxW: number, maxH: number, bg: RGB): Promise<PreparedLogo> {
  let img = sharp(logo).rotate().ensureAlpha();
  try { img = sharp(await img.trim({ threshold: 12 }).toBuffer()).ensureAlpha(); } catch { /* keep as is */ }
  const { data: px, info: pinfo } = await img.clone().resize(64, 64, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let tr = 0, tg = 0, tb = 0, tn = 0, clear = 0;
  for (let i = 0; i < px.length; i += pinfo.channels) {
    if (px[i + 3] < 128) { clear++; continue; }
    tr += px[i]; tg += px[i + 1]; tb += px[i + 2]; tn++;
  }
  const transparent = clear > 0;
  const logoRGB: RGB = tn ? [tr / tn, tg / tn, tb / tn] : [128, 128, 128]; // colour of the visible part only
  const needsPlate = !transparent || Math.abs(lum(logoRGB) - lum(bg)) < 0.3;
  const pad = needsPlate ? 18 : 0;
  const sized = await sharp(await img.png().toBuffer()).resize(maxW - pad * 2, maxH - pad * 2, { fit: 'inside', withoutEnlargement: false }).png().toBuffer({ resolveWithObject: true });
  if (!needsPlate) return { buf: sized.data, w: sized.info.width, h: sized.info.height };
  const w = sized.info.width + pad * 2;
  const h = sized.info.height + pad * 2;
  const plateColor = lum(logoRGB) < 0.5 || !transparent && lum(logoRGB) < 0.6 ? WHITE : INK;
  const plate = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="20" fill="${toHex(plateColor)}"/></svg>`);
  const buf = await sharp(plate).composite([{ input: sized.data, left: pad, top: pad }]).png().toBuffer();
  return { buf, w, h };
}

// ── text stack ───────────────────────────────────────────────────────────────
interface TextItem { kind: 'text'; text: string; font: FontSpec; size: number; color: RGB; opacity?: number; spacing: number; gap: number; h: number }
interface PillItem { kind: 'pill'; text: string; font: FontSpec; size: number; bg: RGB; fg: RGB; spacing: number; gap: number; h: number; w: number }
interface RuleItem { kind: 'rule'; color: RGB; gap: number; h: number }
interface LogoItem { kind: 'logo'; gap: number; h: number; logo: PreparedLogo }
type Item = TextItem | PillItem | RuleItem | LogoItem;

const SANS = (weight: 400 | 600 | 800): FontSpec => ({ family: 'Montserrat', weight });
const ANTON: FontSpec = { family: 'Anton', weight: 400 };
const SERIF: FontSpec = { family: 'Playfair Display', weight: 700 };

const MARGIN = 72;

/** One finished flyer: the store's own photo and logo, with text drawn crisply on top (never by the image AI) */
export async function renderFlyer(input: FlyerInput, format: FlyerFormat): Promise<FlyerResult> {
  const { w: W, h: H } = FLYER_SIZES[format];
  const story = format === 'story';
  const company = drawable(input.company) || 'Our store';
  const industry = classifyIndustry([input.industry, input.businessType], [input.itemName, ...input.listingNames]);
  const family = familyForVariant(primaryFamily(industry, input.kind), input.variant);
  const copy = buildCopy(input.kind, industry, family, input.itemName);
  const light = family === 'clean';
  const hasPhoto = !!input.photo;
  const maxW = W - MARGIN * 2;
  const center = family === 'editorial';

  // ── palette: the store's own colours ──
  const brand = parseHex(input.brandColor);
  const fromLogo = await logoColor(input.logo);
  const panel: RGB = brand ? readable(mix(brand, BLACK, lum(brand) > 0.25 ? 0.72 : 0.4), WHITE, 1) : [14, 14, 16];
  const bgForText: RGB = light ? PAPER : family === 'bold' ? panel : [12, 12, 14];
  const accentBase = fromLogo ?? (brand && contrast(brand, bgForText) > 1.6 ? brand : null) ?? (light ? INK : [232, 228, 220]);
  const accent = readable(accentBase, bgForText, 4.5);
  const panelDark = lum(panel) > 0.06 ? mix(panel, BLACK, 0.5) : panel;
  const textOn = light ? INK : WHITE;
  const pillBg = light ? INK : accent;
  const pillFg: RGB = contrast(WHITE, pillBg) >= contrast(BLACK, pillBg) ? WHITE : BLACK;

  // ── headline lines (the Story gets a stacked, taller composition) ──
  const headFont = family === 'editorial' ? SERIF : family === 'clean' ? SANS(800) : ANTON;
  const headText = family === 'editorial' ? copy.headline.toLowerCase().replace(/(^|\s)\w/g, (m) => m.toUpperCase()) : copy.headline;
  const headWords = headText.split(' ');
  const headLines = story && headWords.length > 1 ? headWords : [headText];
  const headStart = (headFont.family === 'Anton' ? (story ? 250 : 188) : headFont.family === 'Playfair Display' ? (story ? 150 : 120) : story ? 170 : 108);
  const headSpacing = headFont.family === 'Anton' ? 2 : 0;

  const urlText = input.url ? input.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  const heroName = !hasPhoto && !input.logo; // nothing but a name to show: make that the hero

  const logoMaxW = 300, logoMaxH = 120;
  const logoBg = light ? PAPER : [20, 20, 22] as RGB;
  const cornerLogo = input.logo && !(hasPhoto && input.photoHasLogo) && (hasPhoto || light) ? await prepareLogo(input.logo, logoMaxW, logoMaxH, logoBg) : null;
  const heroLogo = input.logo && !hasPhoto && !light ? await prepareLogo(input.logo, 560, 300, [20, 20, 22]) : null;

  const build = (scale: number): { items: Item[]; total: number } => {
    const s = (n: number) => Math.round(n * scale);
    const k = story ? 1.2 : 1; // the taller canvas gets larger supporting type
    const sk = (n: number) => s(n * k);
    const items: Item[] = [];
    const push = (it: Item) => items.push(it);
    if (light && cornerLogo) push({ kind: 'logo', logo: cornerLogo, h: cornerLogo.h, gap: s(34) });
    const hSize = Math.min(...headLines.map((l) => fitSize(l, headFont, maxW, s(headStart), 40, headSpacing)));
    headLines.forEach((l, i) => push({ kind: 'text', text: l, font: headFont, size: hSize, color: textOn, spacing: headSpacing, gap: i === headLines.length - 1 ? s(32) : s(2), h: Math.round(hSize * (headFont.family === 'Anton' ? 1.02 : 1.12)) }));
    if (!heroName) {
      const nm = wrapToFit(company.toUpperCase(), SANS(800), maxW, sk(46), 24, 2, 5);
      nm.lines.forEach((l, i) => push({ kind: 'text', text: l, font: SANS(800), size: nm.size, color: accent, spacing: 5, gap: i === nm.lines.length - 1 ? s(22) : s(6), h: Math.round(nm.size * 1.2) }));
    }
    push({ kind: 'rule', color: accent, gap: s(26), h: s(6) });
    const sup = fitSize(copy.support, SANS(400), maxW, sk(38), 24);
    push({ kind: 'text', text: copy.support, font: SANS(400), size: sup, color: textOn, opacity: 0.92, spacing: 0, gap: s(30), h: Math.round(sup * 1.25) });
    const pr = fitSize(copy.promo, SANS(800), maxW, sk(40), 22, 3);
    push({ kind: 'text', text: copy.promo, font: SANS(800), size: pr, color: textOn, spacing: 3, gap: s(38), h: Math.round(pr * 1.2) });
    const ctaSize = fitSize(copy.cta, SANS(800), maxW - 120, sk(34), 22, 3);
    push({ kind: 'pill', text: copy.cta, font: SANS(800), size: ctaSize, bg: pillBg, fg: pillFg, spacing: 3, w: measureText(copy.cta, SANS(800), ctaSize, 3) + 112, h: sk(96), gap: urlText ? sk(34) : 0 });
    if (urlText) {
      const us = fitSize(urlText, SANS(600), maxW, sk(30), 18, 1);
      push({ kind: 'text', text: urlText, font: SANS(600), size: us, color: textOn, opacity: 0.8, spacing: 1, gap: 0, h: Math.round(us * 1.2) });
    }
    return { items, total: items.reduce((t, it) => t + it.h + it.gap, 0) };
  };

  const bottomPad = story ? 300 : 96; // Stories keep text clear of Instagram's reply bar
  const topPad = story ? 260 : MARGIN;
  const blockBottom = H - bottomPad;
  let scale = 1;
  let stack = build(scale);
  const minTop = H * (light ? 0.5 : 0.4);
  while (blockBottom - stack.total < minTop && scale > 0.6) { scale -= 0.08; stack = build(scale); }
  const blockTop = blockBottom - stack.total;

  // ── background: the store's real photo, cropped with care (faces are never redrawn) ──
  const photoBox = family === 'bold' ? { x: 0, y: 0, w: W, h: Math.max(Math.round(blockTop - 36), 300) }
    : light ? { x: MARGIN, y: story ? 140 : MARGIN, w: W - MARGIN * 2, h: Math.max(Math.round(blockTop - 40 - (story ? 140 : MARGIN)), 300) }
    : { x: 0, y: 0, w: W, h: H };

  const glow = (c: RGB) => `<svg xmlns="http://www.w3.org/2000/svg" width="${photoBox.w}" height="${photoBox.h}"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${toHex(mix(panelDark, c, 0.12))}"/><stop offset="1" stop-color="${toHex(panelDark)}"/></linearGradient><radialGradient id="r1" cx="0.8" cy="0.2" r="0.6"><stop offset="0" stop-color="${toHex(c)}" stop-opacity="0.35"/><stop offset="1" stop-color="${toHex(c)}" stop-opacity="0"/></radialGradient><radialGradient id="r2" cx="0.1" cy="0.9" r="0.7"><stop offset="0" stop-color="${toHex(c)}" stop-opacity="0.2"/><stop offset="1" stop-color="${toHex(c)}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#b)"/><rect width="100%" height="100%" fill="url(#r1)"/><rect width="100%" height="100%" fill="url(#r2)"/></svg>`;
  const photoLayer = async (): Promise<Buffer> => input.photo
    ? sharp(input.photo).rotate().resize(photoBox.w, photoBox.h, { fit: 'cover', position: sharp.strategy.attention }).png().toBuffer()
    : sharp(Buffer.from(glow(accent))).png().toBuffer();

  let minContrast = 21;
  const baseCanvas = async (strength: number): Promise<Buffer> => {
    const photo = await photoLayer();
    const bg = light ? PAPER : family === 'bold' ? panel : [10, 10, 12] as RGB;
    const layers: sharp.OverlayOptions[] = [];
    if (light) {
      const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${photoBox.w}" height="${photoBox.h}"><rect width="100%" height="100%" rx="36" fill="#fff"/></svg>`);
      layers.push({ input: await sharp(photo).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer(), left: photoBox.x, top: photoBox.y });
    } else {
      layers.push({ input: photo, left: 0, top: 0 });
      const parts: string[] = [];
      const defs: string[] = [];
      // top shade so the logo stays readable over any photo
      defs.push(`<linearGradient id="top" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${Math.round(H * 0.28)}"><stop offset="0" stop-color="#000" stop-opacity="${hasPhoto ? 0.72 : 0}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`);
      parts.push(`<rect width="${W}" height="${Math.round(H * 0.28)}" fill="url(#top)"/>`);
      if (family === 'bold') {
        const y2 = photoBox.h;
        defs.push(`<linearGradient id="pf" gradientUnits="userSpaceOnUse" x1="0" y1="${y2 - 260}" x2="0" y2="${y2}"><stop offset="0" stop-color="${toHex(panel)}" stop-opacity="0"/><stop offset="1" stop-color="${toHex(panel)}" stop-opacity="1"/></linearGradient>`);
        parts.push(`<rect y="${y2 - 260}" width="${W}" height="261" fill="url(#pf)"/>`);
      } else {
        if (family === 'editorial' && hasPhoto) parts.push(`<rect width="${W}" height="${H}" fill="#000" fill-opacity="0.16"/>`);
        defs.push(`<linearGradient id="bot" gradientUnits="userSpaceOnUse" x1="0" y1="${Math.round(blockTop - 260)}" x2="0" y2="${Math.round(blockTop + 60)}"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${strength}"/></linearGradient>`);
        parts.push(`<rect y="${Math.round(blockTop - 260)}" width="${W}" height="${H - Math.round(blockTop - 260)}" fill="url(#bot)"/>`);
      }
      layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs.join('')}</defs>${parts.join('')}</svg>`), left: 0, top: 0 });
    }
    return sharp({ create: { width: W, height: H, channels: 4, background: { r: bg[0], g: bg[1], b: bg[2], alpha: 1 } } }).composite(layers).png().toBuffer();
  };

  // Darken the shade behind the text until it is comfortably readable
  let base = await baseCanvas(0.78);
  if (!light && family !== 'bold' && hasPhoto) {
    for (const strength of [0.78, 0.88, 0.95]) {
      base = await baseCanvas(strength);
      const st = await sharp(base).extract({ left: MARGIN, top: Math.max(Math.round(blockTop), 0), width: maxW, height: Math.min(Math.round(stack.total), H - Math.round(blockTop)) }).stats();
      // Judge the lightest typical part of the area (mean plus a little spread)
      const bgc: RGB = [st.channels[0].mean + st.channels[0].stdev * 0.5, st.channels[1].mean + st.channels[1].stdev * 0.5, st.channels[2].mean + st.channels[2].stdev * 0.5];
      minContrast = contrast(WHITE, bgc);
      if (minContrast >= 4.5) break;
    }
  }

  // ── logo + text layers ──
  const composites: sharp.OverlayOptions[] = [];
  if (!light && cornerLogo) {
    const left = center ? Math.round((W - cornerLogo.w) / 2) : MARGIN;
    composites.push({ input: cornerLogo.buf, left, top: topPad });
  }
  if (heroLogo) {
    const areaH = family === 'bold' ? photoBox.h : blockTop;
    composites.push({ input: heroLogo.buf, left: Math.round((W - heroLogo.w) / 2), top: Math.max(Math.round((areaH - heroLogo.h) / 2) - 20, topPad) });
  }

  const els: string[] = [];
  const font = (f: FontSpec) => `font-family="${f.family}" font-weight="${f.weight}"`;
  if (heroName) {
    const f = family === 'editorial' ? SERIF : ANTON;
    const areaTop = light ? photoBox.y : 0;
    const areaH = light ? photoBox.h : family === 'bold' ? photoBox.h : blockTop;
    const nm = wrapToFit(family === 'editorial' ? company : company.toUpperCase(), f, maxW, 170, 60, 3, f.family === 'Anton' ? 2 : 0);
    const lh = Math.round(nm.size * 1.12);
    let y = Math.max(areaTop + Math.round((areaH - lh * nm.lines.length) / 2) + nm.size * 0.8 - (light ? 0 : 20), areaTop + nm.size);
    for (const l of nm.lines) {
      els.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" ${font(f)} font-size="${nm.size}" letter-spacing="${f.family === 'Anton' ? 2 : 0}" fill="${toHex(WHITE)}">${esc(l)}</text>`);
      y += lh;
    }
  }
  let y = blockTop;
  for (const it of stack.items) {
    if (it.kind === 'text') {
      const x = center ? W / 2 : MARGIN;
      els.push(`<text x="${x}" y="${Math.round(y + it.size * 0.84)}" ${center ? 'text-anchor="middle"' : ''} ${font(it.font)} font-size="${it.size}" letter-spacing="${it.spacing}" fill="${toHex(it.color)}" fill-opacity="${it.opacity ?? 1}">${esc(it.text)}</text>`);
    } else if (it.kind === 'rule') {
      const rw = 120;
      els.push(`<rect x="${center ? (W - rw) / 2 : MARGIN}" y="${Math.round(y)}" width="${rw}" height="${it.h}" rx="${it.h / 2}" fill="${toHex(it.color)}"/>`);
    } else if (it.kind === 'pill') {
      const x = center ? Math.round((W - it.w) / 2) : MARGIN;
      els.push(`<rect x="${x}" y="${Math.round(y)}" width="${Math.round(it.w)}" height="${it.h}" rx="${it.h / 2}" fill="${toHex(it.bg)}"/>`);
      els.push(`<text x="${Math.round(x + it.w / 2)}" y="${Math.round(y + it.h / 2 + it.size * 0.36)}" text-anchor="middle" ${font(it.font)} font-size="${it.size}" letter-spacing="${it.spacing}" fill="${toHex(it.fg)}">${esc(it.text)}</text>`);
    } else if (it.kind === 'logo') {
      composites.push({ input: it.logo.buf, left: MARGIN, top: Math.round(y) });
    }
    y += it.h + it.gap;
  }
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${els.join('')}</svg>`;
  const textPng = new Resvg(textSvg, { font: RESVG_FONT }).render().asPng();
  composites.push({ input: Buffer.from(textPng), left: 0, top: 0 });

  const png = await sharp(base).composite(composites).png().toBuffer();
  const meta = await sharp(png).metadata();
  if (meta.width !== W || meta.height !== H) throw new Error(`Flyer came out ${meta.width}x${meta.height}, expected ${W}x${H}`);
  return { png, family, width: W, height: H, contrast: minContrast, usedPhoto: hasPhoto, usedLogo: !!(cornerLogo || heroLogo) };
}
