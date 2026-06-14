import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'editorial',
  name: 'Editorial',
  colors: {
    bg: '#ffffff',
    surface: '#f5f5f5',
    text: '#111111',
    accent: '#d4a96a',
    nav: '#1a1a1a',
    hero: '#1a1a1a',
  },
  fonts: {
    heading: 'Playfair Display',
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
  tagline: 'Curated essentials for a considered life.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
  products: [
    {
      id: 'demo-product-1',
      name: 'Linen Wrap Coat',
      description: 'Hand-finished outerwear in undyed linen.',
      priceCents: 24800,
      imageUrls: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Outerwear',
      isFeatured: true,
    },
    {
      id: 'demo-product-2',
      name: 'Ceramic Vase, No. 3',
      description: 'Stoneware vessel, matte ash glaze.',
      priceCents: 8800,
      imageUrls: [
        'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Home',
    },
    {
      id: 'demo-product-3',
      name: 'Silk Slip Dress',
      description: 'Bias-cut silk in deep ink.',
      priceCents: 19500,
      imageUrls: [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Apparel',
    },
    {
      id: 'demo-product-4',
      name: 'Leather Tote',
      description: 'Vegetable-tanned leather, brass hardware.',
      priceCents: 32000,
      imageUrls: [
        'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Accessories',
    },
  ],
  services: [
    {
      id: 'demo-service-1',
      name: 'Private Styling Session',
      description: 'A one-hour personal consultation with our stylists.',
      priceCents: 15000,
      durationMinutes: 60,
      imageUrls: [
        'https://images.unsplash.com/photo-1521590832167-f3a8c1f23ed1?auto=format&fit=crop&w=900&q=80',
      ],
      isFeatured: true,
    },
    {
      id: 'demo-service-2',
      name: 'Tailoring & Alterations',
      description: 'Bespoke fitting and alteration service.',
      priceCents: 6000,
      durationMinutes: 45,
      imageUrls: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80',
      ],
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Margot Lefèvre',
      bio: 'Lead stylist with fifteen years in editorial fashion.',
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    },
  ],
};
