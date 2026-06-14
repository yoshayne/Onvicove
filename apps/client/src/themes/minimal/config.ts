import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'minimal',
  name: 'Minimal',
  colors: {
    bg: '#ffffff',
    surface: '#f8f8f8',
    text: '#111111',
    accent: '#111111',
    nav: '#ffffff',
    hero: '#ffffff',
  },
  fonts: {
    heading: 'Inter',
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
  tagline: 'Considered design, reduced to what matters.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'demo-product-1',
      name: 'Cotton Shirt',
      description: 'Boxy fit, midweight cotton poplin.',
      priceCents: 8900,
      imageUrls: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Apparel',
      isFeatured: true,
    },
    {
      id: 'demo-product-2',
      name: 'Porcelain Mug',
      description: 'Minimal white porcelain, 300ml.',
      priceCents: 2400,
      imageUrls: [
        'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Home',
    },
    {
      id: 'demo-product-3',
      name: 'Wool Trousers',
      description: 'Tapered leg, undyed wool.',
      priceCents: 14500,
      imageUrls: [
        'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Apparel',
    },
    {
      id: 'demo-product-4',
      name: 'Canvas Tote',
      description: 'Heavyweight canvas, raw edge.',
      priceCents: 4200,
      imageUrls: [
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Accessories',
    },
  ],
  services: [
    {
      id: 'demo-service-1',
      name: 'Design Consultation',
      description: 'A focused one-hour session to plan your space.',
      priceCents: 12000,
      durationMinutes: 60,
      imageUrls: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80',
      ],
      isFeatured: true,
    },
    {
      id: 'demo-service-2',
      name: 'Studio Fitting',
      description: 'Personalized fitting and adjustments.',
      priceCents: 5000,
      durationMinutes: 30,
      imageUrls: [
        'https://images.unsplash.com/photo-1556905200-79a181502aef?auto=format&fit=crop&w=900&q=80',
      ],
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Anna Berg',
      bio: 'Studio lead focused on quiet, functional design.',
      avatarUrl:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
    },
  ],
};
