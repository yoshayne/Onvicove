import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'bright',
  name: 'Bright',
  colors: {
    bg: '#ffffff',
    surface: '#f0f0ff',
    text: '#111111',
    accent: '#ff3cac',
    nav: '#ffffff',
    hero: '#f0f0ff',
  },
  fonts: {
    heading: 'Poppins',
    body: 'Poppins',
  },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: 'Glow up your everyday routine.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'demo-product-1',
      name: 'Glow Serum',
      description: 'Vitamin C brightening serum for radiant skin.',
      priceCents: 3200,
      imageUrls: [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Skincare',
      isFeatured: true,
    },
    {
      id: 'demo-product-2',
      name: 'Pastel Eyeshadow Palette',
      description: '12 dreamy shades for every mood.',
      priceCents: 2400,
      imageUrls: [
        'https://images.unsplash.com/photo-1583241475880-083f84372725?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Makeup',
    },
    {
      id: 'demo-product-3',
      name: 'Hydra Lip Tint',
      description: 'Sheer color with a juicy finish.',
      priceCents: 1400,
      imageUrls: [
        'https://images.unsplash.com/photo-1631214540242-3cd8c4b0b3d6?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Makeup',
    },
    {
      id: 'demo-product-4',
      name: 'Shimmer Body Mist',
      description: 'Light fragrance with a soft glow finish.',
      priceCents: 1800,
      imageUrls: [
        'https://images.unsplash.com/photo-1610461888750-10bfc601b874?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Fragrance',
    },
  ],
  services: [
    {
      id: 'demo-service-1',
      name: 'Signature Facial',
      description: 'A glow-boosting facial tailored to your skin type.',
      priceCents: 8500,
      durationMinutes: 60,
      imageUrls: [
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80',
      ],
      isFeatured: true,
    },
    {
      id: 'demo-service-2',
      name: 'Lash & Brow Styling',
      description: 'Lash lift and brow shaping for a fresh look.',
      priceCents: 4500,
      durationMinutes: 30,
      imageUrls: [
        'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=900&q=80',
      ],
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Joy Park',
      bio: 'Beauty specialist obsessed with all things glowy and pink.',
      avatarUrl:
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80',
    },
  ],
};
