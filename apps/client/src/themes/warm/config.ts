import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'warm',
  name: 'Warm',
  colors: {
    bg: '#fdf8f3',
    surface: '#f5e8d8',
    text: '#3d2314',
    accent: '#8b5e3c',
    nav: '#fdf8f3',
    hero: '#f5e8d8',
  },
  fonts: {
    // Headings use "Lora" (className font-['Lora']), body uses "Inter".
    // NOTE: these Google Fonts need to be loaded in index.html for the
    // intended look (e.g. via <link> tags to fonts.googleapis.com).
    heading: 'Lora',
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
  tagline: 'Slow down. Breathe. Nourish yourself.',
  heroImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1600&q=80',
  products: [
    {
      id: 'demo-prod-1',
      name: 'Lavender Soy Candle',
      description: 'Hand-poured candle with calming lavender and oat milk notes.',
      priceCents: 2800,
      imageUrls: ['https://images.unsplash.com/photo-1602874801006-e26c4c5b5b6c?w=800&q=80'],
      category: 'Candles',
      isFeatured: true,
      stockQuantity: 30,
    },
    {
      id: 'demo-prod-2',
      name: 'Herbal Tea Sampler',
      description: 'A curated set of four organic herbal blends.',
      priceCents: 2200,
      imageUrls: ['https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80'],
      category: 'Tea',
      isFeatured: false,
      stockQuantity: 50,
    },
    {
      id: 'demo-prod-3',
      name: 'Clay Facial Mask',
      description: 'Detoxifying kaolin clay mask with rosehip oil.',
      priceCents: 3400,
      compareAtPriceCents: 4000,
      imageUrls: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80'],
      category: 'Skincare',
      isFeatured: true,
      stockQuantity: 20,
    },
  ],
  services: [
    {
      id: 'demo-serv-1',
      name: 'Signature Massage',
      description: 'A full-body relaxation massage with warm aromatic oils.',
      priceCents: 9000,
      durationMinutes: 60,
      imageUrls: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'],
      category: 'Massage',
      isFeatured: true,
      requiresDeposit: true,
      depositCents: 2000,
    },
    {
      id: 'demo-serv-2',
      name: 'Botanical Facial',
      description: 'Restorative facial using small-batch botanical extracts.',
      priceCents: 7500,
      durationMinutes: 45,
      imageUrls: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80'],
      category: 'Skincare',
      isFeatured: false,
    },
    {
      id: 'demo-serv-3',
      name: 'Sound Bath Session',
      description: 'A guided sound healing session for deep relaxation.',
      priceCents: 5500,
      durationMinutes: 30,
      imageUrls: ['https://images.unsplash.com/photo-1535914254981-b5012eebbd15?w=800&q=80'],
      category: 'Wellness',
      isFeatured: false,
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Maya Hartwell',
      bio: 'Licensed esthetician and wellness coach with 10 years of experience.',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    },
    {
      id: 'demo-staff-2',
      name: 'Noah Reyes',
      bio: 'Massage therapist specializing in deep tissue and aromatherapy.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00d5a4ee9bb3?w=400&q=80',
    },
  ],
};
