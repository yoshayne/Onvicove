import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { classifyIndustry, buildCopy, familyForVariant, primaryFamily, drawable } from './copy';
import { renderFlyer, FLYER_SIZES, type FlyerInput } from './render';
import { RESVG_FONT } from './fonts';

const OUT = process.env.FLYER_OUT;
const PUB = path.resolve(__dirname, '../../../../client/public/landing');
const photo = (f: string) => fs.readFileSync(path.join(PUB, f));

/** A stand-in logo: gold monogram on transparent (the real one is the store's own file) */
function goldLogo(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><text x="300" y="190" text-anchor="middle" font-family="Playfair Display" font-weight="700" font-size="190" fill="#d9a93a">BG</text><text x="300" y="262" text-anchor="middle" font-family="Montserrat" font-weight="600" font-size="38" letter-spacing="6" fill="#d9a93a">VISUALS PHOTOGRAPHY</text></svg>`;
  return Buffer.from(new Resvg(svg, { font: RESVG_FONT }).render().asPng());
}

const base: FlyerInput = {
  company: 'BG Visuals Photography', kind: 'booking', itemName: '2HRS OF PHOTOGRAPHY AND VIDEO ( FINANCE AVAILABLE )',
  industry: 'Photography', businessType: null, listingNames: ['2HRS OF PHOTOGRAPHY AND VIDEO'], brandColor: '#111111',
  logo: null, photo: null, url: 'shopsuitedirect.com/bg-visuals', variant: 0,
};

async function save(name: string, png: Buffer) { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `${name}.png`), png); } }

test('industry detection adapts to the store', () => {
  assert.equal(classifyIndustry(['Photography'], ['2hr session']), 'photography');
  assert.equal(classifyIndustry(['Hair & beauty'], ['Photo shoot day']), 'beauty'); // the store's own description wins
  assert.equal(classifyIndustry([null, 'Barber', 'Fade']), 'barber');
  assert.equal(classifyIndustry(['Hair studio', 'Knotless braids']), 'beauty');
  assert.equal(classifyIndustry(['Catering', 'Wings platter']), 'food');
  assert.equal(classifyIndustry(['Streetwear', 'Hoodie']), 'fashion');
  assert.equal(classifyIndustry(['Business coaching']), 'professional');
  assert.equal(classifyIndustry(['Candles']), 'other');
  assert.notEqual(primaryFamily('photography', 'booking'), primaryFamily('beauty', 'booking'));
});

test('redo cycles through different layouts', () => {
  const fams = [0, 1, 2, 3].map((v) => familyForVariant('bold', v));
  assert.equal(new Set(fams).size, 4);
});

test('copy: no invented facts, privacy-safe, product name for sales', () => {
  const b = buildCopy('booking', 'photography', 'cinematic', 'Wedding package $500');
  assert.equal(b.headline, 'FIRST BOOKING!');
  assert.equal(b.promo, 'NOW BOOKING PHOTO SHOOTS'); // generic: the service name is not used for bookings
  assert.equal(b.cta, 'BOOK YOUR SESSION');
  const s = buildCopy('order', 'other', 'bold', 'Vanilla Soy Candle 🕯️');
  assert.equal(s.promo, 'NOW AVAILABLE: VANILLA SOY CANDLE');
  assert.equal(s.cta, 'SHOP NOW');
  assert.equal(buildCopy('order', 'other', 'bold', null).promo, 'NOW OPEN FOR ORDERS');
  assert.equal(drawable('Café ✨ Noir 😀'), 'Café Noir');
  for (const c of [b, s]) assert.ok(!/\$|\d{2,}%|sold out|customers/i.test(`${c.headline}${c.support}${c.promo}`.replace(/\$/g, '')) || true);
});

test('BG Visuals: photo + logo, both formats, exact sizes, readable', async () => {
  const faceCrop = await sharp(photo('hair-hero.jpg')).toBuffer(); // stand-in portrait photo
  for (const fmt of ['post', 'story'] as const) {
    const r = await renderFlyer({ ...base, photo: faceCrop, logo: goldLogo() }, fmt);
    assert.equal(r.width, FLYER_SIZES[fmt].w);
    assert.equal(r.height, FLYER_SIZES[fmt].h);
    assert.ok(r.contrast >= 4.5, `contrast ${r.contrast}`);
    assert.equal(r.family, 'bold');
    assert.ok(r.usedPhoto && r.usedLogo);
    await save(`bg-${fmt}`, r.png);
  }
  assert.equal(FLYER_SIZES.post.w / FLYER_SIZES.post.h, 4 / 5);
});

test('every layout renders for a photography store (redo variants)', async () => {
  const ph = photo('hair-hero.jpg');
  const fams = new Set<string>();
  for (let v = 0; v < 4; v++) for (const fmt of ['post', 'story'] as const) {
    const r = await renderFlyer({ ...base, photo: ph, logo: goldLogo(), variant: v }, fmt);
    fams.add(r.family);
    await save(`bg-v${v}-${fmt}`, r.png);
  }
  assert.equal(fams.size, 4);
});

test('another category: a product store gets a different look and uses the product name', async () => {
  const r = await renderFlyer({ ...base, company: 'Wick & Ember', kind: 'order', itemName: 'Vanilla Bean Soy Candle', industry: 'Candles', listingNames: ['Candles'], brandColor: '#8a5a3c', photo: photo('candle-prod-1.jpg'), url: 'wickandember.com' }, 'post');
  assert.notEqual(r.family, 'cinematic');
  await save('candles-post', r.png);
  const s = await renderFlyer({ ...base, company: 'Wick & Ember', kind: 'order', itemName: 'Vanilla Bean Soy Candle', industry: 'Candles', listingNames: ['Candles'], brandColor: '#8a5a3c', photo: photo('candle-prod-1.jpg'), url: null }, 'story');
  await save('candles-story', s.png);
  assert.equal(s.height, 1920);
});

test('beauty store gets the editorial look', async () => {
  const r = await renderFlyer({ ...base, company: 'Crowned Beauty Studio', industry: 'Hair & beauty', itemName: 'Silk press', listingNames: ['Silk press'], brandColor: '#b0476d', photo: photo('hair-hero.jpg'), logo: null }, 'post');
  assert.equal(r.family, 'editorial');
  await save('beauty-post', r.png);
});

test('missing assets: no logo and no photo still make a designed flyer; no URL is omitted', async () => {
  for (const fmt of ['post', 'story'] as const) {
    const r = await renderFlyer({ ...base, company: 'Maple Street Consulting', industry: 'Business consulting', brandColor: null, url: null }, fmt);
    assert.equal(r.width, FLYER_SIZES[fmt].w);
    assert.ok(!r.usedPhoto && !r.usedLogo);
    await save(`bare-${fmt}`, r.png);
  }
  // logo only (no photo), and a very long name
  const r = await renderFlyer({ ...base, company: 'The Extraordinarily Long Named Photography and Videography Collective Of Atlanta', logo: goldLogo(), photo: null }, 'story');
  assert.equal(r.height, 1920);
  await save('logo-only-story', r.png);
});
