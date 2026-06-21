import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'obsidian' as any,
  name: 'Obsidian',
  colors: {
    bg: '#000000',
    surface: '#111111',
    text: '#ffffff',
    accent: '#c9a84c',
    nav: '#000000',
    hero: '#0a0a0a',
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
  tagline: 'Timeless luxury. Expertly crafted.',
  heroImageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'obs-1', name: 'Diamond Solitaire Ring',
      description: 'Hand-set brilliant cut diamond, 18k gold band.',
      priceCents: 450000,
      imageUrls: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80'],
      isFeatured: true,
    },
    {
      id: 'obs-2', name: 'Black Pearl Necklace',
      description: 'South Sea pearl, platinum chain, lobster clasp.',
      priceCents: 285000,
      imageUrls: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'obs-3', name: 'Gold Cuff Bracelet',
      description: 'Hammered 22k gold, artisan finish.',
      priceCents: 195000,
      imageUrls: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'obs-4', name: 'Obsidian Timepiece',
      description: 'Swiss movement, sapphire crystal, 42mm case.',
      priceCents: 895000,
      imageUrls: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80'],
    },
  ],
  services: [
    {
      id: 'obs-s1', name: 'Private Consultation',
      description: 'Exclusive one-on-one with our master jeweler.',
      priceCents: 50000, durationMinutes: 60,
    },
    {
      id: 'obs-s2', name: 'Custom Design Session',
      description: 'Bespoke piece creation from concept to reality.',
      priceCents: 100000, durationMinutes: 90,
    },
  ],
  staff: [{
    id: 'obs-st1', name: 'Jean-Pierre Moreau',
    bio: 'Master jeweler with thirty years of excellence.',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
  }],
};
