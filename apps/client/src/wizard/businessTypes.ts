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
  category?: string;
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
  /** Theme we suggest and why */
  themeId: ThemeId;
  why: string[];
  starterServices: StarterService[];
}

const s = (category: string, name: string, dollars: number, durationMinutes: number, extra: Partial<StarterService> = {}): StarterService => ({
  category,
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
    themeId: 'barber',
    why: ['Built for barbershops: dark, sharp and booking-first', 'Your services and prices up front, grouped by Haircuts, Beard and Combos', 'A Book button that stays in reach on phones, plus a next-available time shortcut'],
    starterServices: [s('Haircuts', 'Haircut', 30, 30), s('Haircuts', 'Kids cut', 22, 30), s('Beard', 'Beard trim', 15, 20), s('Combos', 'Cut & beard', 40, 45)],
  },
  {
    id: 'hair_salon', label: 'Hair salon', emoji: '💇', group: 'services', mode: 'book', industry: 'Hair salon',
    themeId: 'studio',
    why: ['Soft, elegant look that matches a salon experience', 'Services grouped by category with clear times and prices', 'Pick-your-stylist booking and a work gallery for before-and-afters'],
    starterServices: [s('Cuts & styling', 'Women\'s cut', 55, 45), s('Cuts & styling', 'Blowout', 45, 45), s('Color', 'Color', 120, 120), s('Color', 'Highlights', 160, 150)],
  },
  {
    id: 'natural_hair', label: 'Natural hair', emoji: '🌿', group: 'services', mode: 'book', industry: 'Natural hair',
    themeId: 'studio',
    why: ['Warm, welcoming look that feels personal', 'Easy booking for longer appointments, with your stylists up front', 'Space to show your work'],
    starterServices: [s('Styling', 'Wash & style', 85, 90), s('Styling', 'Twist-out', 95, 120), s('Styling', 'Silk press', 110, 120), s('Care', 'Trim', 40, 45)],
  },
  {
    id: 'braids_locs', label: 'Braids & locs', emoji: '✨', group: 'services', mode: 'book', industry: 'Braids & locs',
    themeId: 'ink',
    why: ['Work-first layout: your gallery sits right under the top banner so your styles sell themselves', 'High contrast makes photos pop', 'Deposits to hold long appointments are built in'],
    starterServices: [
      s('Braids', 'Knotless braids', 220, 240, { depositCents: 5000 }),
      s('Locs', 'Loc retwist', 90, 120),
      s('Locs', 'Loc maintenance', 100, 120),
      s('Locs', 'Starter locs', 180, 180, { depositCents: 5000 }),
    ],
  },
  {
    id: 'nails', label: 'Nails', emoji: '💅', group: 'services', mode: 'book', industry: 'Nails',
    themeId: 'studio',
    why: ['Soft, photo-friendly look that suits nail art', 'Services by category (Hands, Feet) with quick booking', 'Pick-your-nail-tech booking'],
    starterServices: [s('Hands', 'Manicure', 30, 45), s('Feet', 'Pedicure', 45, 60), s('Hands', 'Gel set', 55, 90), s('Hands', 'Full set', 70, 120)],
  },
  {
    id: 'lashes_brows', label: 'Lashes & brows', emoji: '👁️', group: 'services', mode: 'book', industry: 'Lashes & brows',
    themeId: 'studio',
    why: ['A clean, polished look that feels professional', 'Lashes and Brows grouped clearly with prices and times', 'Simple booking for fills and refreshes'],
    starterServices: [s('Lashes', 'Classic lashes', 120, 120), s('Lashes', 'Volume lashes', 150, 150), s('Lashes', 'Lash fill', 65, 60), s('Brows', 'Brow shape', 30, 30)],
  },
  {
    id: 'spa_massage', label: 'Spa & massage', emoji: '🧖', group: 'services', mode: 'book', industry: 'Spa & massage',
    themeId: 'studio',
    why: ['Calm, soft look that sets a relaxing tone', 'Treatments grouped (Massage, Facials) with durations', 'Easy online booking for repeat clients'],
    starterServices: [s('Massage', 'Swedish massage', 90, 60), s('Massage', 'Deep tissue massage', 110, 60), s('Facials', 'Facial', 85, 60), s('Massage', 'Hot stone massage', 130, 90)],
  },
  {
    id: 'tattoo', label: 'Tattoo', emoji: '🖋️', group: 'services', mode: 'book', industry: 'Tattoo',
    themeId: 'ink',
    why: ['Dark, high-contrast look that lets your artwork stand out', 'Your portfolio gallery comes right after the banner', 'Deposits to hold sessions are built in'],
    starterServices: [
      s('Sessions', 'Consultation', 0, 30),
      s('Sessions', 'Small piece', 100, 60, { depositCents: 5000 }),
      s('Sessions', 'Half-day session', 400, 240, { depositCents: 10000 }),
      s('Sessions', 'Touch-up', 50, 30),
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
