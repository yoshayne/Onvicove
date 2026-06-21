import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'craft' as any,
  name: 'Craft',
  colors: {
    bg: '#f5f0e8',
    surface: '#ece5d8',
    text: '#2c1f14',
    accent: '#5c4a32',
    nav: '#f5f0e8',
    hero: '#ece5d8',
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
  tagline: 'Made by hand. Made to love.',
  heroImageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'cra-1', name: 'Beeswax Taper Set',
      description: 'Hand-dipped, 100% natural beeswax, set of 4.',
      priceCents: 2800,
      imageUrls: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80'],
      isFeatured: true,
    },
    {
      id: 'cra-2', name: 'Lavender Soy Candle',
      description: 'Small batch, organic lavender, 40+ hour burn.',
      priceCents: 3400,
      imageUrls: ['https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'cra-3', name: 'Botanical Soap Bar',
      description: 'Cold-process, calendula + oat, unscented.',
      priceCents: 1200,
      imageUrls: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'cra-4', name: 'Linen Gift Bag',
      description: 'Natural linen, hand-stamped logo.',
      priceCents: 1800,
      imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80'],
    },
  ],
  services: [
    {
      id: 'cra-s1', name: 'Candle Making Workshop',
      description: 'Small group class, make your own candle to take home.',
      priceCents: 7500, durationMinutes: 120,
    },
    {
      id: 'cra-s2', name: 'Custom Scent Blending',
      description: 'Create your signature fragrance with our artisan.',
      priceCents: 9500, durationMinutes: 90,
    },
  ],
  staff: [{
    id: 'cra-st1', name: 'Willow Marsh',
    bio: 'Artisan candlemaker, herbalist, slow-living advocate.',
    avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80',
  }],
};
