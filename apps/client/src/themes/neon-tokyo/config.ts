import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'neon-tokyo' as any,
  name: 'Neon Tokyo',
  colors: {
    bg: '#050510',
    surface: '#0a0a20',
    text: '#ffffff',
    accent: '#ff2d9b',
    nav: '#050510',
    hero: '#050510',
  },
  fonts: { heading: 'Inter', body: 'Inter' },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: '次世代のギア。ストリートのために。',
  heroImageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'neo-1', name: 'Cyber Hoodie',
      description: 'Reflective piping, thermal lining, oversized fit.',
      priceCents: 18900,
      imageUrls: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=900&q=80'],
      isFeatured: true,
    },
    {
      id: 'neo-2', name: 'Tech Bag',
      description: 'Waterproof shell, modular compartments.',
      priceCents: 12000,
      imageUrls: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'neo-3', name: 'Neon Runner',
      description: 'Limited drop, air-cushioned sole.',
      priceCents: 24500,
      imageUrls: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'neo-4', name: 'Glitch Cap',
      description: 'Structured cap, iridescent brim.',
      priceCents: 5500,
      imageUrls: ['https://images.unsplash.com/photo-1556306535-38febf6cdbe1?auto=format&fit=crop&w=900&q=80'],
    },
  ],
  services: [
    {
      id: 'neo-s1', name: 'VIP Drop Access',
      description: 'Early access to all limited releases before public.',
      priceCents: 9900, durationMinutes: 0,
    },
    {
      id: 'neo-s2', name: 'Custom Collab',
      description: 'Co-design a limited piece with our creative team.',
      priceCents: 75000, durationMinutes: 120,
    },
  ],
  staff: [{
    id: 'neo-st1', name: 'KAI_ZERO',
    bio: 'Creative director. Drop culture pioneer.',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  }],
};
