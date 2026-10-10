import type { StoreMode, ThemeId } from '../themes/types';

export type BusinessTypeId =
  | 'clothing' | 'retail' | 'jewelry' | 'handmade' | 'food' | 'beauty_products' | 'home_gifts'
  | 'barber' | 'hair_salon' | 'natural_hair' | 'braids_locs' | 'nails' | 'lashes_brows' | 'spa_massage' | 'tattoo'
  | 'other';

export interface StarterService {
  name: string;
  priceCents: number;
  durationMinutes: number;
  description?: string;
  depositCents?: number;
}

export interface BusinessType {
  id: BusinessTypeId;
  label: string;
  emoji: string;
  group: 'products' | 'services' | 'other';
  /** What the site does by default for this kind of business (changeable on the same screen) */
  mode: StoreMode;
  /** Free-text industry saved on the store (keeps existing screens and Stripe's category guess working) */
  industry: string;
  /** Theme we suggest, why, and how it shows. Uses the closest existing theme until purpose-built ones exist. */
  themeId: ThemeId;
  why: string[];
  starterServices: StarterService[];
}

const s = (name: string, dollars: number, durationMinutes: number, extra: Partial<StarterService> = {}): StarterService => ({
  name,
  priceCents: Math.round(dollars * 100),
  durationMinutes,
  ...extra,
});

/** Product businesses come first: they are most of today's customers. */
export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'clothing', label: 'Clothing & apparel', emoji: '👕', group: 'products', mode: 'store', industry: 'Clothing & apparel',
    themeId: 'bold',
    why: ['Big product photos on a high-contrast dark layout make clothing pop', 'Built for drops and streetwear-style shopping', 'Quick add-to-cart on phones'],
    starterServices: [],
  },
  {
    id: 'retail', label: 'Retail & boutique', emoji: '🛍️', group: 'products', mode: 'store', industry: 'Retail & boutique',
    themeId: 'minimal',
    why: ['A clean grid keeps the focus on your products', 'Works for any mix of items without feeling cluttered', 'Fast to scan on a phone'],
    starterServices: [],
  },
  {
    id: 'jewelry', label: 'Jewelry & accessories', emoji: '💍', group: 'products', mode: 'store', industry: 'Jewelry & accessories',
    themeId: 'editorial',
    why: ['Elegant serif headlines and dark luxury styling suit fine details', 'Large close-up photos show off the craftsmanship'],
    starterServices: [],
  },
  {
    id: 'handmade', label: 'Art, crafts & handmade', emoji: '🎨', group: 'products', mode: 'store', industry: 'Art, crafts & handmade',
    themeId: 'warm',
    why: ['Warm, earthy colors feel personal and handmade', 'Leaves room to tell the story behind each piece'],
    starterServices: [],
  },
  {
    id: 'food', label: 'Food, drink & bakery', emoji: '🧁', group: 'products', mode: 'store', industry: 'Food, drink & bakery',
    themeId: 'warm',
    why: ['A warm, inviting look that makes food feel fresh', 'Photo-led product cards'],
    starterServices: [],
  },
  {
    id: 'beauty_products', label: 'Beauty & skincare products', emoji: '🧴', group: 'products', mode: 'store', industry: 'Beauty & skincare products',
    themeId: 'bright',
    why: ['Playful pastel colors fit beauty brands', 'Product-first layout with easy checkout'],
    starterServices: [],
  },
  {
    id: 'home_gifts', label: 'Candles, home & gifts', emoji: '🕯️', group: 'products', mode: 'store', industry: 'Candles, home & gifts',
    themeId: 'warm',
    why: ['Cozy colors that suit candles and home goods', 'Gift-friendly product cards'],
    starterServices: [],
  },

  {
    id: 'barber', label: 'Barbershop', emoji: '💈', group: 'services', mode: 'book', industry: 'Barbershop',
    themeId: 'bold',
    why: ['A dark, sharp look that barbershop clients expect', 'Your services and prices up front, with a Book button always in reach on phones', 'Great for showing off fresh cuts'],
    starterServices: [s('Haircut', 30, 30), s('Beard trim', 15, 20), s('Cut & beard', 40, 45), s('Kids cut', 22, 30)],
  },
  {
    id: 'hair_salon', label: 'Hair salon', emoji: '💇', group: 'services', mode: 'book', industry: 'Hair salon',
    themeId: 'editorial',
    why: ['Elegant, upscale styling that matches a salon experience', 'Clear service menu with times and prices', 'Room for before-and-after photos'],
    starterServices: [s('Women\'s cut', 55, 45), s('Blowout', 45, 45), s('Color', 120, 120), s('Highlights', 160, 150)],
  },
  {
    id: 'natural_hair', label: 'Natural hair', emoji: '🌿', group: 'services', mode: 'book', industry: 'Natural hair',
    themeId: 'warm',
    why: ['Warm, welcoming colors that feel personal', 'Easy booking for longer appointments', 'Space to show your work'],
    starterServices: [s('Wash & style', 85, 90), s('Twist-out', 95, 120), s('Silk press', 110, 120), s('Trim', 40, 45)],
  },
  {
    id: 'braids_locs', label: 'Braids & locs', emoji: '✨', group: 'services', mode: 'book', industry: 'Braids & locs',
    themeId: 'editorial',
    why: ['Big, bold photos let your styles sell themselves', 'Built for long appointments with a deposit to hold the spot', 'Elegant look that matches premium pricing'],
    starterServices: [
      s('Knotless braids', 220, 240, { depositCents: 5000 }),
      s('Loc retwist', 90, 120),
      s('Loc maintenance', 100, 120),
      s('Starter locs', 180, 180, { depositCents: 5000 }),
    ],
  },
  {
    id: 'nails', label: 'Nails', emoji: '💅', group: 'services', mode: 'book', industry: 'Nails',
    themeId: 'bright',
    why: ['Fun, colorful look that fits nail art', 'Photo-friendly layout for your designs', 'Quick booking on phones'],
    starterServices: [s('Manicure', 30, 45), s('Pedicure', 45, 60), s('Gel set', 55, 90), s('Full set', 70, 120)],
  },
  {
    id: 'lashes_brows', label: 'Lashes & brows', emoji: '👁️', group: 'services', mode: 'book', industry: 'Lashes & brows',
    themeId: 'minimal',
    why: ['A clean, soft layout that feels polished and professional', 'Services and prices easy to scan', 'Simple booking for fills and refreshes'],
    starterServices: [s('Classic lashes', 120, 120), s('Volume lashes', 150, 150), s('Lash fill', 65, 60), s('Brow shape', 30, 30)],
  },
  {
    id: 'spa_massage', label: 'Spa & massage', emoji: '🧖', group: 'services', mode: 'book', industry: 'Spa & massage',
    themeId: 'warm',
    why: ['Calm, warm colors that set a relaxing tone', 'Clear treatment menu with durations', 'Easy online booking for repeat clients'],
    starterServices: [s('Swedish massage', 90, 60), s('Deep tissue massage', 110, 60), s('Facial', 85, 60), s('Hot stone massage', 130, 90)],
  },
  {
    id: 'tattoo', label: 'Tattoo', emoji: '🖋️', group: 'services', mode: 'book', industry: 'Tattoo',
    themeId: 'bold',
    why: ['Dark, high-contrast look that lets your artwork stand out', 'Deposits to hold sessions are built in', 'Big gallery space for your portfolio'],
    starterServices: [
      s('Consultation', 0, 30),
      s('Small piece', 100, 60, { depositCents: 5000 }),
      s('Half-day session', 400, 240, { depositCents: 10000 }),
      s('Touch-up', 50, 30),
    ],
  },

  {
    id: 'other', label: 'Something else', emoji: '➕', group: 'other', mode: 'both', industry: '',
    themeId: 'editorial',
    why: [],
    starterServices: [],
  },
];

export const BUSINESS_TYPE_BY_ID: Record<string, BusinessType> = Object.fromEntries(BUSINESS_TYPES.map((t) => [t.id, t]));
