export type Industry = 'photography' | 'barber' | 'beauty' | 'food' | 'fashion' | 'professional' | 'other';
export type Family = 'cinematic' | 'editorial' | 'bold' | 'clean';
export type SaleKind = 'order' | 'booking';

const RULES: [Industry, RegExp][] = [
  ['photography', /photo|video|film|cinema|portrait|headshot|drone|videograph/],
  ['barber', /barber|fade|haircut|grooming|shave|lineup/],
  ['beauty', /beauty|salon|hair|lash|nail|brow|makeup|\bmua\b|spa\b|skin|wax|esthetic|massage|braid|loc\b|locs/],
  ['food', /restaurant|catering|food|bak(e|ery)|cafe|coffee|kitchen|chef|grill|pizza|dessert|cake|bbq|meal|juice/],
  ['fashion', /cloth|apparel|fashion|boutique|wear|streetwear|shoe|sneaker|jewel|hat\b|merch|tee\b|hoodie|dress/],
  ['professional', /consult|coach|account|tax|law|legal|agency|real estate|realtor|financ|insurance|tutor|therap|counsel|mentor|trainer|fitness/],
];

/** Work out the kind of business from what the store says about itself and what it lists */
function match(parts: (string | null | undefined)[]): Industry {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  for (const [industry, re] of RULES) if (re.test(text)) return industry;
  return 'other';
}

/** What the store says about itself (`about`) outranks what it happens to list (`listings`) */
export function classifyIndustry(about: (string | null | undefined)[], listings: (string | null | undefined)[] = []): Industry {
  const first = match(about);
  return first !== 'other' ? first : match([...about, ...listings]);
}

/** The look each kind of business starts with (a redo cycles to the next ones) */
export function primaryFamily(industry: Industry, kind: SaleKind): Family {
  switch (industry) {
    case 'photography': return 'cinematic';
    case 'beauty': case 'fashion': return 'editorial';
    case 'barber': case 'food': return 'bold';
    case 'professional': return 'clean';
    default: return kind === 'booking' ? 'cinematic' : 'bold';
  }
}

const ORDER: Family[] = ['cinematic', 'editorial', 'bold', 'clean'];
export function familyForVariant(primary: Family, variant: number): Family {
  return ORDER[(ORDER.indexOf(primary) + Math.max(variant, 0)) % ORDER.length];
}

/** Keep only characters our fonts can draw (no emoji or other scripts) */
export function drawable(s: string | null | undefined): string {
  return (s ?? '').replace(/[^ -ɏ‘-”–—…]/g, '').replace(/\s+/g, ' ').trim();
}

const SUPPORT: Record<Family, string> = {
  cinematic: 'The journey is officially underway.',
  editorial: 'Thank you for supporting our business.',
  bold: 'Thank you for the support.',
  clean: 'Thank you for your trust.',
};

export interface FlyerCopy {
  headline: string;
  support: string;
  promo: string;
  cta: string;
}

export function buildCopy(kind: SaleKind, industry: Industry, family: Family, itemName: string | null): FlyerCopy {
  const support = SUPPORT[family];
  if (kind === 'order') {
    const name = drawable(itemName).toUpperCase();
    const short = name.length > 34 ? `${name.slice(0, 33).trimEnd()}…` : name;
    return { headline: 'FIRST SALE!', support, promo: short ? `NOW AVAILABLE: ${short}` : 'NOW OPEN FOR ORDERS', cta: 'SHOP NOW' };
  }
  const promo = industry === 'photography' ? 'NOW BOOKING PHOTO SHOOTS'
    : industry === 'beauty' || industry === 'barber' ? 'NOW BOOKING APPOINTMENTS'
    : industry === 'professional' ? 'NOW BOOKING CONSULTATIONS'
    : 'NOW ACCEPTING BOOKINGS';
  return { headline: 'FIRST BOOKING!', support, promo, cta: industry === 'photography' ? 'BOOK YOUR SESSION' : 'BOOK AN APPOINTMENT' };
}
