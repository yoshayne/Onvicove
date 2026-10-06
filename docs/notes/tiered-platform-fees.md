# Tiered platform fees (to revisit)

Status: not built. Decision pending.

## Current state
- One global platform fee for every plan: 4.9% + $0.30 per payment (orders, bookings, booking balances).
- Defaults in `apps/server/src/services/settings.ts` (`platform_fee_percent`, `platform_fee_fixed_cents`), overridable via env vars (`PLATFORM_FEE_PERCENT`, `PLATFORM_FEE_FIXED_CENTS`) or the admin Settings page (stored in DB, so production may differ from the code default).
- Fee is taken as `application_fee_amount` on destination charges (`routes/stripe.ts`, `services/stripe.ts`). Stripe's processing fee (~2.9% + $0.30) comes out of the platform balance, so our margin on sales is about 2% of volume.
- The "stripe fee" saved in `platform_transactions` is a hardcoded estimate (2.9% + $0.30), not Stripe's actual fee.

## Proposal: lower the percentage as the plan tier rises
Keep the $0.30 fixed part the same on every plan (it only covers Stripe's own $0.30).

| Plan | Monthly | Fee | Margin on sales | Store saves vs Starter |
|---|---|---|---|---|
| Starter | Free | 4.9% + $0.30 | ~2.0% | none |
| Pro | $29 | 4.5% + $0.30 | ~1.6% | 0.4% |
| Business | $79 | 3.9% + $0.30 | ~1.0% | 1.0% |

Reasoning:
- Not big enough to give up fees entirely; ~1% margin at the top tier covers refunds, disputes and cases where Stripe's real fee exceeds 2.9% (international cards, currency conversion).
- Lowering fees later is easy; raising them on existing stores is not, so start higher.
- Pro's 0.4% discount is small (fee saving covers the $29 only at ~$7,000/mo in sales), so Pro should sell on features (limits, AI credits), not the fee. Business's 1% saving breaks even around $8,000/mo.
- Alternative considered: 4.9 / 4.4 / 3.9 for a more even step down (0.5% each).

## Implementation sketch
- Add per-plan `platform_fee_percent` and `platform_fee_fixed_cents` to `PlanConfig` and the admin Settings plan table.
- Make `computePlatformFee` take the tenant's plan; use the plan at payment time so upgrades and downgrades apply to new payments only.
- Optionally record Stripe's actual fee instead of the 2.9% + $0.30 estimate.

## Open questions
- Final percentages (4.9 / 4.5 / 3.9 vs 4.9 / 4.4 / 3.9)?
- What is production's admin Settings value today?
