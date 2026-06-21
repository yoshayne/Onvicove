import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'brutalist' as any,
  name: 'Brutalist',
  colors: {
    bg: '#ffffff',
    surface: '#f0f0f0',
    text: '#000000',
    accent: '#0000ff',
    nav: '#ffffff',
    hero: '#ffffff',
  },
  fonts: { heading: 'Arial Black, sans-serif', body: 'monospace' },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: "We don't follow trends. We set them.",
  heroImageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'bru-1', name: 'DROP 001 HOODIE',
      description: 'Heavyweight cotton, garment-washed black.',
      priceCents: 18500,
      imageUrls: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?auto=format&fit=crop&w=900&q=80'],
      isFeatured: true,
    },
    {
      id: 'bru-2', name: 'LOGO TEE V3',
      description: 'Oversized fit, screen-printed logo.',
      priceCents: 8500,
      imageUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'bru-3', name: 'CARGO PANTS',
      description: 'Multi-pocket, raw hem, relaxed fit.',
      priceCents: 22000,
      imageUrls: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'bru-4', name: 'CHAIN WALLET',
      description: 'Welded steel, heavy duty chain.',
      priceCents: 6500,
      imageUrls: ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80'],
    },
  ],
  services: [
    {
      id: 'bru-s1', name: 'BRAND IDENTITY',
      description: 'Logo, palette, typography system — the whole thing.',
      priceCents: 500000, durationMinutes: 0,
    },
    {
      id: 'bru-s2', name: 'CAMPAIGN SHOOT',
      description: 'Full creative direction plus photography.',
      priceCents: 350000, durationMinutes: 480,
    },
  ],
  staff: [{
    id: 'bru-st1', name: 'RAW STUDIO',
    bio: 'Branding, design and digital experiences for the bold.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  }],
};
