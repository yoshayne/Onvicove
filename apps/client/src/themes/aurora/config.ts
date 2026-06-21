import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'aurora' as any,
  name: 'Aurora',
  colors: {
    bg: '#0d0d1a',
    surface: '#1a1a2e',
    text: '#ffffff',
    accent: '#a78bfa',
    nav: '#0d0d1a',
    hero: '#0d0d1a',
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
  tagline: 'Nourish your body, mind & soul.',
  heroImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'aur-1', name: 'Crystal Glow Serum',
      description: 'Radiance-boosting vitamin C + hyaluronic complex.',
      priceCents: 8900,
      imageUrls: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80'],
      isFeatured: true,
    },
    {
      id: 'aur-2', name: 'Moon Mist Toner',
      description: 'Balancing rosewater and niacinamide mist.',
      priceCents: 4500,
      imageUrls: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'aur-3', name: 'Nebula Night Cream',
      description: 'Deep repair with peptides and bakuchiol.',
      priceCents: 7200,
      imageUrls: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=80'],
    },
    {
      id: 'aur-4', name: 'Aurora Eye Elixir',
      description: 'Brightening caffeine + vitamin K eye treatment.',
      priceCents: 5600,
      imageUrls: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80'],
    },
  ],
  services: [
    {
      id: 'aur-s1', name: 'Holistic Facial',
      description: 'Crystal energy + LED light therapy treatment.',
      priceCents: 14500, durationMinutes: 75,
    },
    {
      id: 'aur-s2', name: 'Sound Bath Session',
      description: 'Deep relaxation with crystal singing bowls.',
      priceCents: 8500, durationMinutes: 60,
    },
    {
      id: 'aur-s3', name: 'Reiki Healing',
      description: 'Energy balancing and chakra alignment.',
      priceCents: 9500, durationMinutes: 60,
    },
  ],
  staff: [{
    id: 'aur-st1', name: 'Luna Ashford',
    bio: 'Holistic healer & certified aesthetician.',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
  }],
};
