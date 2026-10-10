import type { ProductData, ServiceData, ThemeId } from '../types';

/** Everything that makes Barber, Studio and Ink look different. The page itself is shared (BookingFirstStorefront). */
export interface BookingFirstPreset {
  id: Extract<ThemeId, 'barber' | 'studio' | 'ink'>;
  name: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  /** Used only until the owner picks a brand colour (--brand-color wins) */
  accent: string;
  onAccent: string;
  radius: number;
  headingFont: string;
  bodyFont: string;
  uppercaseHeadings: boolean;
  heroFallback: string;
  /** Show the work gallery right after the hero (tattoo / portfolio-led businesses) when no custom order is set */
  galleryFirst?: boolean;
  tagline: string;
  services: ServiceData[];
  products: ProductData[];
}

const svc = (id: string, name: string, dollars: number, minutes: number, category: string, description?: string): ServiceData => ({
  id: `demo-${id}`,
  name,
  description,
  priceCents: dollars * 100,
  durationMinutes: minutes,
  category,
});
const prod = (id: string, name: string, dollars: number, description: string): ProductData => ({
  id: `demo-p-${id}`,
  name,
  description,
  priceCents: dollars * 100,
});

export const barberPreset: BookingFirstPreset = {
  id: 'barber',
  name: 'Barber',
  bg: '#0c0c0d',
  surface: '#161618',
  text: '#f4f4f5',
  muted: 'rgba(244,244,245,0.62)',
  border: 'rgba(255,255,255,0.12)',
  accent: '#d4a73a',
  onAccent: '#111111',
  radius: 4,
  headingFont: "'Oswald', 'Inter', sans-serif",
  bodyFont: "'Inter', sans-serif",
  uppercaseHeadings: true,
  heroFallback: 'linear-gradient(135deg,#1c1c1f 0%,#0c0c0d 55%,#2b2211 100%)',
  tagline: 'Sharp cuts. Clean lines. Book your chair in seconds.',
  services: [
    svc('cut', 'Haircut', 30, 30, 'Haircuts', 'Cut, shape-up and finish.'),
    svc('kids', 'Kids cut', 22, 30, 'Haircuts'),
    svc('beard', 'Beard trim', 15, 20, 'Beard', 'Line-up and hot towel.'),
    svc('combo', 'Cut & beard', 40, 45, 'Combos', 'The full works.'),
  ],
  products: [prod('pomade', 'Matte Pomade', 18, 'Strong hold, no shine.'), prod('oil', 'Beard Oil', 16, 'Soft, conditioned beard.')],
};

export const studioPreset: BookingFirstPreset = {
  id: 'studio',
  name: 'Studio',
  bg: '#faf6f2',
  surface: '#ffffff',
  text: '#2c2420',
  muted: 'rgba(44,36,32,0.62)',
  border: 'rgba(44,36,32,0.12)',
  accent: '#b5838d',
  onAccent: '#ffffff',
  radius: 16,
  headingFont: "'Playfair Display', Georgia, serif",
  bodyFont: "'DM Sans', 'Inter', sans-serif",
  uppercaseHeadings: false,
  heroFallback: 'linear-gradient(135deg,#f4e4e1 0%,#faf6f2 55%,#e8d9d0 100%)',
  tagline: 'Treat yourself. Book your appointment online.',
  services: [
    svc('mani', 'Manicure', 30, 45, 'Nails', 'Shape, cuticle care and polish.'),
    svc('gel', 'Gel set', 55, 90, 'Nails'),
    svc('lash', 'Classic lashes', 120, 120, 'Lashes', 'A natural, everyday look.'),
    svc('brow', 'Brow shape', 30, 30, 'Brows'),
  ],
  products: [prod('serum', 'Nourishing Serum', 34, 'Daily glow, lightweight feel.'), prod('balm', 'Lip Balm', 12, 'Soft and long-lasting.')],
};

export const inkPreset: BookingFirstPreset = {
  id: 'ink',
  name: 'Ink',
  bg: '#080808',
  surface: '#121212',
  text: '#fafafa',
  muted: 'rgba(250,250,250,0.62)',
  border: 'rgba(255,255,255,0.16)',
  accent: '#e63946',
  onAccent: '#ffffff',
  radius: 0,
  headingFont: "'Bebas Neue', 'Oswald', 'Inter', sans-serif",
  bodyFont: "'Space Grotesk', 'Inter', sans-serif",
  uppercaseHeadings: true,
  heroFallback: 'linear-gradient(160deg,#1a1a1a 0%,#080808 60%)',
  galleryFirst: true,
  tagline: 'Custom work. Book a consultation or a session.',
  services: [
    svc('consult', 'Consultation', 0, 30, 'Sessions', 'Talk through your idea and placement.'),
    svc('small', 'Small piece', 100, 60, 'Sessions', 'Deposit holds your spot.'),
    svc('half', 'Half-day session', 400, 240, 'Sessions'),
    svc('touch', 'Touch-up', 50, 30, 'Sessions'),
  ],
  products: [prod('print', 'Flash Print', 25, 'Signed print of a flash design.'), prod('aftercare', 'Aftercare Kit', 20, 'Everything you need to heal well.')],
};

export const presetFor = (id: string) => ({ barber: barberPreset, studio: studioPreset, ink: inkPreset } as Record<string, BookingFirstPreset>)[id];
