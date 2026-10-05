import type { ThemeConfig, ProductData, ServiceData, StaffData } from '../types';

export const config: ThemeConfig = {
  id: 'lens',
  name: 'Lens',
  colors: {
    bg: '#0d0d0d',
    surface: '#1a1a1a',
    text: '#f0ede8',
    accent: '#c8b8a2',
    nav: '#0d0d0d',
    hero: '#0d0d0d',
  },
  fonts: {
    heading: 'DM Serif Display',
    body: 'DM Sans',
  },
};

export const defaults: {
  tagline: string;
  heroImageUrl: string;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
} = {
  tagline: 'Photography for people with something to say.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1920&q=80',
  products: [
    {
      id: 'demo-product-1',
      name: 'Fine Art Print — No. 12',
      description: 'Archival pigment on 300gsm cotton rag. Limited edition of 25.',
      priceCents: 28000,
      imageUrls: [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Prints',
      isFeatured: true,
    },
    {
      id: 'demo-product-2',
      name: 'Signed Zine — Vol. 3',
      description: 'Hand-numbered, saddle-stitched, 48 pages.',
      priceCents: 4500,
      imageUrls: [
        'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Publications',
    },
    {
      id: 'demo-product-3',
      name: 'Fine Art Print — No. 7',
      description: 'Urban landscape series. Archival pigment print.',
      priceCents: 19500,
      imageUrls: [
        'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Prints',
    },
    {
      id: 'demo-product-4',
      name: 'Camera Strap — Woven',
      description: 'Hand-loomed cotton strap, brass hardware.',
      priceCents: 6800,
      imageUrls: [
        'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Accessories',
    },
    {
      id: 'demo-product-5',
      name: 'Monograph — City Portraits',
      description: 'Hardbound, 192 pages, 87 photographs.',
      priceCents: 8500,
      imageUrls: [
        'https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Publications',
    },
    {
      id: 'demo-product-6',
      name: 'Fine Art Print — No. 21',
      description: 'Portrait series. Edition of 10.',
      priceCents: 42000,
      imageUrls: [
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80',
      ],
      category: 'Prints',
      isFeatured: true,
    },
  ],
  services: [
    {
      id: 'demo-service-1',
      name: 'Portrait Session',
      description: 'A 2-hour studio or on-location portrait shoot. Includes 20 edited selects.',
      priceCents: 65000,
      durationMinutes: 120,
      imageUrls: [
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80',
      ],
      isFeatured: true,
    },
    {
      id: 'demo-service-2',
      name: 'Brand / Editorial Shoot',
      description: 'Full-day commercial shoot for brands, agencies, and editorial clients.',
      priceCents: 250000,
      durationMinutes: 480,
      imageUrls: [
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'demo-service-3',
      name: 'Film Development',
      description: 'C-41 or black & white development. Scans included.',
      priceCents: 3500,
      durationMinutes: 30,
      imageUrls: [
        'https://images.unsplash.com/photo-1567448400815-e6e6d6e72157?auto=format&fit=crop&w=900&q=80',
      ],
    },
  ],
  staff: [
    {
      id: 'demo-staff-1',
      name: 'Jordan Mercer',
      bio: 'Documentary and portrait photographer based in Brooklyn. Published in NYT, Time, and Aperture.',
      avatarUrl:
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'demo-staff-2',
      name: 'Naomi Voss',
      bio: 'Specialises in editorial and brand photography. Studio manager.',
      avatarUrl:
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80',
    },
  ],
};
