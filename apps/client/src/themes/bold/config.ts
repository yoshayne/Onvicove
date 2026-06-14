import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'bold',
  name: 'Bold',
  colors: {
    bg: '#0a0a0a',
    surface: '#161616',
    text: '#ffffff',
    accent: '#e8ff00',
    nav: '#0a0a0a',
    hero: '#0a0a0a',
  },
  fonts: {
    // No special font import needed — relies on Tailwind's system font stack
    // with font-black / uppercase / tracking-wide for the streetwear look.
    heading: 'sans-serif',
    body: 'sans-serif',
  },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: 'WEAR THE STREET. OWN THE MOMENT.',
  heroImageUrl: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1600&q=80',
  products: [
    {
      id: 'demo-prod-1',
      name: 'Oversized Hoodie',
      description: 'Heavyweight cotton, boxy fit, embroidered logo.',
      priceCents: 8900,
      compareAtPriceCents: 11000,
      imageUrls: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80'],
      category: 'Hoodies',
      isFeatured: true,
      stockQuantity: 25,
    },
    {
      id: 'demo-prod-2',
      name: 'Cargo Track Pants',
      description: 'Relaxed fit utility pants with side pockets.',
      priceCents: 7400,
      imageUrls: ['https://images.unsplash.com/photo-1602293589914-9e08fbc24c11?w=800&q=80'],
      category: 'Bottoms',
      isFeatured: false,
      stockQuantity: 18,
    },
    {
      id: 'demo-prod-3',
      name: 'Graphic Tee',
      description: 'Bold print tee, 100% combed cotton.',
      priceCents: 3500,
      imageUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'],
      category: 'Tees',
      isFeatured: true,
      stockQuantity: 40,
    },
    {
      id: 'demo-prod-4',
      name: 'Snapback Cap',
      description: 'Structured 6-panel cap with embroidered patch.',
      priceCents: 2900,
      imageUrls: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&q=80'],
      category: 'Accessories',
      isFeatured: false,
      stockQuantity: 60,
    },
  ],
  services: [
    {
      id: 'demo-serv-1',
      name: 'Custom Print Session',
      description: 'One-on-one custom design and print on your own gear.',
      priceCents: 5000,
      durationMinutes: 60,
      imageUrls: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80'],
      category: 'Customization',
      isFeatured: true,
    },
    {
      id: 'demo-serv-2',
      name: 'Style Consultation',
      description: 'Get a personalized streetwear styling session.',
      priceCents: 3000,
      durationMinutes: 30,
      imageUrls: ['https://images.unsplash.com/photo-1542060748-10c28b62716f?w=800&q=80'],
      category: 'Styling',
      isFeatured: false,
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Jordan Blake',
      bio: 'Lead designer and brand curator.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    },
  ],
};
