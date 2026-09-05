import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'lens',
  name: 'Lens',
  colors: {
    bg: '#0c0c0c',
    surface: '#181818',
    text: '#f0ede8',
    accent: '#c8a96e',
    nav: '#0c0c0c',
    hero: '#0c0c0c',
  },
  fonts: {
    heading: 'Cormorant Garamond',
    body: 'Inter',
  },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: 'Capturing light, framing life.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1800&q=80',
  products: [
    {
      id: 'demo-product-1',
      name: 'Essential Package',
      description: '30 edited digital images, online gallery, 1-hour session.',
      priceCents: 29900,
      imageUrls: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Packages',
      isFeatured: true,
    },
    {
      id: 'demo-product-2',
      name: 'Full Day Package',
      description: '200+ edited images, 8-hour coverage, two shooters.',
      priceCents: 189900,
      imageUrls: [
        'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Packages',
      isFeatured: true,
    },
    {
      id: 'demo-product-3',
      name: '12×18 Fine Art Print',
      description: 'Archival pigment print on cotton rag paper.',
      priceCents: 14900,
      imageUrls: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Prints',
    },
    {
      id: 'demo-product-4',
      name: 'Canvas Gallery Wrap',
      description: 'Museum-quality canvas, 24×36, ready to hang.',
      priceCents: 24900,
      imageUrls: [
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Prints',
    },
  ],
  services: [
    {
      id: 'demo-service-1',
      name: 'Portrait Session',
      description: 'A relaxed 1-hour studio or outdoor portrait session. Includes 20 edited images.',
      priceCents: 25000,
      durationMinutes: 60,
      imageUrls: [
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80',
      ],
      isFeatured: true,
    },
    {
      id: 'demo-service-2',
      name: 'Engagement Session',
      description: 'Two-hour golden-hour session for couples. 40 edited images delivered.',
      priceCents: 45000,
      durationMinutes: 120,
      imageUrls: [
        'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=900&q=80',
      ],
      isFeatured: true,
    },
    {
      id: 'demo-service-3',
      name: 'Brand / Commercial',
      description: 'Half-day commercial shoot for brands, products, and headshots.',
      priceCents: 85000,
      durationMinutes: 240,
      imageUrls: [
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=900&q=80',
      ],
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Maya Osei',
      bio: 'Natural light portrait and wedding photographer based in Atlanta.',
      avatarUrl:
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
    },
  ],
};
