import type Stripe from 'stripe';
import { getBaseUrl } from '../lib/baseUrl';
import { z } from 'zod';

/**
 * Details we collect up front and hand to Stripe so the store owner doesn't have to type them again in Stripe's
 * onboarding. Deliberately NOT included: date of birth, SSN, EIN, bank details — those are identity data that
 * Stripe collects (and verifies) itself on its hosted form; we never see or store them.
 */
export const stripeDetailsSchema = z.object({
  business_type: z.enum(['individual', 'company']).default('individual'),
  phone: z.string().trim().max(30).optional(),
  mcc: z.string().regex(/^\d{4}$/).optional(),
  product_description: z.string().trim().max(300).optional(),
  address: z
    .object({
      line1: z.string().trim().min(1).max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(1).max(100),
      state: z.string().trim().min(1).max(100),
      postal_code: z.string().trim().min(1).max(20),
      country: z.string().trim().length(2).default('US'),
    })
    .optional(),
});
export type StripeDetails = z.infer<typeof stripeDetailsSchema>;

/** What the store sells -> Stripe merchant category code. */
export const MCC_OPTIONS = [
  { mcc: '7221', label: 'Photography' },
  { mcc: '7230', label: 'Beauty, hair & barber' },
  { mcc: '7298', label: 'Health & wellness / spa' },
  { mcc: '7991', label: 'Fitness & recreation' },
  { mcc: '8299', label: 'Classes, coaching & tutoring' },
  { mcc: '7311', label: 'Marketing & creative services' },
  { mcc: '8999', label: 'Consulting & professional services' },
  { mcc: '5812', label: 'Food & drink' },
  { mcc: '5651', label: 'Clothing & accessories' },
  { mcc: '5970', label: 'Art, crafts & handmade goods' },
  { mcc: '5999', label: 'Other retail' },
] as const;

/** Best guess from the free-text industry the owner typed in the setup wizard. */
export function guessMcc(industry: string | null | undefined): string | undefined {
  const t = (industry ?? '').toLowerCase();
  const rules: [RegExp, string][] = [
    [/photo|film|video/, '7221'],
    [/salon|hair|barber|nail|beauty|makeup|lash/, '7230'],
    [/spa|massage|wellness|health/, '7298'],
    [/fitness|gym|yoga|trainer|sport/, '7991'],
    [/coach|tutor|class|lesson|teach/, '8299'],
    [/design|market|creative|brand/, '7311'],
    [/consult|agency|service/, '8999'],
    [/coffee|cafe|bakery|food|restaurant|catering/, '5812'],
    [/cloth|apparel|fashion|boutique/, '5651'],
    [/art|craft|handmade|jewel|candle/, '5970'],
    [/shop|store|retail/, '5999'],
  ];
  return rules.find(([re]) => re.test(t))?.[1];
}

interface TenantLike { company_name: string; slug: string; industry?: string | null }
interface UserLike { email?: string | null; first_name?: string | null; last_name?: string | null }

/** Fields to pre-fill on the connected account. Only what we actually know is included. */
export function buildPrefill(tenant: TenantLike, user: UserLike | undefined, details: Partial<StripeDetails>): Stripe.AccountUpdateParams {
  const url = `${getBaseUrl()}/${tenant.slug}`;
  const mcc = details.mcc ?? guessMcc(tenant.industry);
  const profile: Stripe.AccountUpdateParams.BusinessProfile = { name: tenant.company_name, url };
  if (mcc) profile.mcc = mcc;
  if (details.phone) profile.support_phone = details.phone;
  if (user?.email) profile.support_email = user.email;
  if (details.product_description) profile.product_description = details.product_description;

  const out: Stripe.AccountUpdateParams = { business_profile: profile };
  if (details.business_type) out.business_type = details.business_type;

  const address = details.address
    ? { line1: details.address.line1, line2: details.address.line2 || undefined, city: details.address.city, state: details.address.state, postal_code: details.address.postal_code, country: details.address.country }
    : undefined;

  if (details.business_type === 'company') {
    out.company = { name: tenant.company_name, ...(details.phone ? { phone: details.phone } : {}), ...(address ? { address } : {}) };
  } else {
    const ind: Stripe.AccountUpdateParams.Individual = {};
    if (user?.first_name) ind.first_name = user.first_name;
    if (user?.last_name) ind.last_name = user.last_name;
    if (user?.email) ind.email = user.email;
    if (details.phone) ind.phone = details.phone;
    if (address) ind.address = address;
    if (Object.keys(ind).length) out.individual = ind;
  }
  return out;
}
