import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'magazine' as any,
  name: 'Magazine',
  colors: {
    bg: '#f8f6f1',
    surface: '#eeece7',
    text: '#1a1a1a',
    accent: '#1a1a1a',
    nav: '#f8f6f1',
    hero: '#f8f6f1',
  },
  fonts: { heading: 'Playfair Display', body: 'Inter' },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: 'Capturing moments. Telling stories.',
  heroImageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'mag-1', name: 'Portrait Print',
      description: 'Fine art print on archival paper, signed edition.',
      priceCents: 32000,
      imageUrls: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80'],
      isFeatured: true,
    },
    {
      id: 'mag-2', name: 'Landscape Series',
      description: 'Limited edition landscape, numbered 1–50.',
      priceCents: 48000,
      imageUrls: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'mag-3', name: 'Still Life No. 7',
      description: 'Medium format film, gallery wrap.',
      priceCents: 25000,
      imageUrls: ['https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'mag-4', name: 'Urban Study',
      description: 'Street photography series, set of 3.',
      priceCents: 18000,
      imageUrls: ['https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80'],
    },
  ],
  services: [
    {
      id: 'mag-s1', name: 'Portrait Session',
      description: 'Studio or location shoot, 2 hours, 30 edited images.',
      priceCents: 65000, durationMinutes: 120,
    },
    {
      id: 'mag-s2', name: 'Brand Photography',
      description: 'Full-day editorial shoot for brands and creatives.',
      priceCents: 150000, durationMinutes: 480,
    },
  ],
  staff: [{
    id: 'mag-st1', name: 'Elena Vasquez',
    bio: 'Editorial photographer. Published in Vogue, Harper\'s.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  }],
};
