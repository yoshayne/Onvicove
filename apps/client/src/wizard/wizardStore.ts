import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeId, StoreMode } from '../themes/types';

export interface WizardProduct {
  id: string;
  name: string;
  priceCents: number;
  description?: string;
  imageKey?: string;
  imageUrl?: string;
}

export interface WizardService {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  description?: string;
}

export interface WizardStaffMember {
  id: string;
  name: string;
  email?: string;
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TimeRange {
  start: string;
  end: string;
}

export type WeeklyAvailability = Record<DayKey, TimeRange[]>;

export type PlanId = 'starter' | 'pro' | 'business';

export const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  mon: [{ start: '09:00', end: '17:00' }],
  tue: [{ start: '09:00', end: '17:00' }],
  wed: [{ start: '09:00', end: '17:00' }],
  thu: [{ start: '09:00', end: '17:00' }],
  fri: [{ start: '09:00', end: '17:00' }],
  sat: [],
  sun: [],
};

export interface WizardState {
  currentStep: number;

  businessName: string;
  slug: string;
  mode: StoreMode;
  themeId: ThemeId;

  tagline: string;
  brandColor: string;
  city: string;
  industry: string;

  logoFileKey?: string;
  logoPreviewUrl?: string;
  heroImageFileKey?: string;
  heroImagePreviewUrl?: string;

  products: WizardProduct[];
  services: WizardService[];

  availability: WeeklyAvailability;
  staff: WizardStaffMember[];

  stripeConnected: boolean;
  stripeAccountId?: string;

  plan: PlanId;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  setBusinessName: (name: string) => void;
  setSlug: (slug: string) => void;
  setMode: (mode: StoreMode) => void;
  setThemeId: (themeId: ThemeId) => void;

  setTagline: (tagline: string) => void;
  setBrandColor: (color: string) => void;
  setCity: (city: string) => void;
  setIndustry: (industry: string) => void;

  setLogo: (key: string | undefined, previewUrl: string | undefined) => void;
  setHeroImage: (key: string | undefined, previewUrl: string | undefined) => void;

  addProduct: (product: WizardProduct) => void;
  updateProduct: (id: string, updates: Partial<WizardProduct>) => void;
  removeProduct: (id: string) => void;

  addService: (service: WizardService) => void;
  updateService: (id: string, updates: Partial<WizardService>) => void;
  removeService: (id: string) => void;

  setAvailability: (availability: WeeklyAvailability) => void;
  setDayRanges: (day: DayKey, ranges: TimeRange[]) => void;

  addStaff: (staff: WizardStaffMember) => void;
  removeStaff: (id: string) => void;

  setStripeConnected: (connected: boolean, accountId?: string) => void;

  setPlan: (plan: PlanId) => void;

  reset: () => void;
}

const initialState: Omit<
  WizardState,
  | 'setStep'
  | 'nextStep'
  | 'prevStep'
  | 'setBusinessName'
  | 'setSlug'
  | 'setMode'
  | 'setThemeId'
  | 'setTagline'
  | 'setBrandColor'
  | 'setCity'
  | 'setIndustry'
  | 'setLogo'
  | 'setHeroImage'
  | 'addProduct'
  | 'updateProduct'
  | 'removeProduct'
  | 'addService'
  | 'updateService'
  | 'removeService'
  | 'setAvailability'
  | 'setDayRanges'
  | 'addStaff'
  | 'removeStaff'
  | 'setStripeConnected'
  | 'setPlan'
  | 'reset'
> = {
  currentStep: 1,
  businessName: '',
  slug: '',
  mode: 'both',
  themeId: 'editorial',
  tagline: '',
  brandColor: '#3D4F7C',
  city: '',
  industry: '',
  logoFileKey: undefined,
  logoPreviewUrl: undefined,
  heroImageFileKey: undefined,
  heroImagePreviewUrl: undefined,
  products: [],
  services: [],
  availability: DEFAULT_AVAILABILITY,
  staff: [],
  stripeConnected: false,
  stripeAccountId: undefined,
  plan: 'starter',
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((s) => ({ currentStep: Math.min(11, s.currentStep + 1) })),
      prevStep: () => set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),

      setBusinessName: (name) => set({ businessName: name }),
      setSlug: (slug) => set({ slug }),
      setMode: (mode) => set({ mode }),
      setThemeId: (themeId) => set({ themeId }),

      setTagline: (tagline) => set({ tagline }),
      setBrandColor: (color) => set({ brandColor: color }),
      setCity: (city) => set({ city }),
      setIndustry: (industry) => set({ industry }),

      setLogo: (key, previewUrl) => set({ logoFileKey: key, logoPreviewUrl: previewUrl }),
      setHeroImage: (key, previewUrl) =>
        set({ heroImageFileKey: key, heroImagePreviewUrl: previewUrl }),

      addProduct: (product) => set((s) => ({ products: [...s.products, product] })),
      updateProduct: (id, updates) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      removeProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      addService: (service) => set((s) => ({ services: [...s.services, service] })),
      updateService: (id, updates) =>
        set((s) => ({
          services: s.services.map((sv) => (sv.id === id ? { ...sv, ...updates } : sv)),
        })),
      removeService: (id) =>
        set((s) => ({ services: s.services.filter((sv) => sv.id !== id) })),

      setAvailability: (availability) => set({ availability }),
      setDayRanges: (day, ranges) =>
        set((s) => ({ availability: { ...s.availability, [day]: ranges } })),

      addStaff: (staff) => set((s) => ({ staff: [...s.staff, staff] })),
      removeStaff: (id) => set((s) => ({ staff: s.staff.filter((st) => st.id !== id) })),

      setStripeConnected: (connected, accountId) =>
        set({ stripeConnected: connected, stripeAccountId: accountId }),

      setPlan: (plan) => set({ plan }),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'onvicove-wizard',
    }
  )
);

export function selectWizardCompleteness(state: WizardState): {
  businessNameDone: boolean;
  modeDone: boolean;
  themeDone: boolean;
  brandInfoDone: boolean;
  heroPhotoDone: boolean;
  catalogDone: boolean;
  availabilityDone: boolean;
  paymentsDone: boolean;
  planDone: boolean;
  percentComplete: number;
  isReadyToLaunch: boolean;
} {
  const businessNameDone = state.businessName.trim().length > 0;
  const modeDone = !!state.mode;
  const themeDone = !!state.themeId;
  const brandInfoDone = state.tagline.trim().length > 0 && state.city.trim().length > 0;
  const heroPhotoDone = !!state.heroImageFileKey || !!state.heroImagePreviewUrl;
  const catalogDone =
    (state.mode !== 'book' && state.products.length > 0) ||
    (state.mode !== 'store' && state.services.length > 0) ||
    state.mode === 'both'
      ? state.products.length > 0 || state.services.length > 0
      : false;
  const availabilityDone =
    state.mode === 'store' || Object.values(state.availability).some((r) => r.length > 0);
  const paymentsDone = state.stripeConnected;
  const planDone = !!state.plan;

  const checks = [
    businessNameDone,
    modeDone,
    themeDone,
    brandInfoDone,
    heroPhotoDone,
    catalogDone,
    availabilityDone,
    paymentsDone,
    planDone,
  ];
  const percentComplete = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );

  // Stripe connection is optional — merchants can connect payments later
  // from the dashboard, so it shouldn't block launching the site.
  const requiredChecks = [
    businessNameDone,
    modeDone,
    themeDone,
    brandInfoDone,
    heroPhotoDone,
    catalogDone,
    availabilityDone,
    planDone,
  ];

  return {
    businessNameDone,
    modeDone,
    themeDone,
    brandInfoDone,
    heroPhotoDone,
    catalogDone,
    availabilityDone,
    paymentsDone,
    planDone,
    percentComplete,
    isReadyToLaunch: requiredChecks.every(Boolean),
  };
}
