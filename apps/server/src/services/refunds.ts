import { db } from '../db/client';
import { refundStorePayment } from './stripe';

export interface RefundResult { toCardCents: number; error?: string }

/**
 * Give money back for one booking/subscription: card payments first (newest first), each limited to what is left of it.
 * Records negative ledger rows tied to the original charge. Returns how much went back to the card.
 */
export async function refundLedgerCharges(params: {
  tenantId: string;
  stripeAccountId: string | null;
  referenceType: 'booking' | 'subscription';
  referenceId: string;
  amountCents: number;
}): Promise<RefundResult> {
  const { tenantId, stripeAccountId, referenceType, referenceId } = params;
  const charges = await db`
    SELECT t.id, t.gross_amount_cents, t.platform_fee_cents, t.stripe_transfer_id,
           t.gross_amount_cents + COALESCE((SELECT SUM(r.gross_amount_cents) FROM platform_transactions r WHERE r.refund_of = t.id), 0) AS left_cents
    FROM platform_transactions t
    WHERE t.tenant_id = ${tenantId} AND t.reference_type = ${referenceType} AND t.reference_id = ${referenceId}
      AND t.gross_amount_cents > 0 AND t.stripe_transfer_id LIKE 'pi\\_%'
    ORDER BY t.created_at DESC
  `;
  let remaining = params.amountCents;
  let toCard = 0;
  for (const ch of charges) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, ch.left_cents as number);
    if (take <= 0) continue;
    let result;
    try {
      result = await refundStorePayment(ch.stripe_transfer_id as string, stripeAccountId, take);
    } catch (err) {
      return { toCardCents: toCard, error: `Stripe refund failed: ${String(err)}${toCard ? ` (the first $${(toCard / 100).toFixed(2)} was already refunded)` : ''}` };
    }
    const gross = ch.gross_amount_cents as number;
    const fee = Math.round(((ch.platform_fee_cents as number) * take) / gross);
    await db`
      INSERT INTO platform_transactions (tenant_id, reference_id, reference_type, gross_amount_cents, platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id, refund_of)
      VALUES (${tenantId}, ${referenceId}, ${referenceType}, ${-take}, ${-fee}, 0, ${-(take - fee)}, ${result.refund.id}, ${ch.id})
    `;
    if (referenceType === 'booking') {
      await db`INSERT INTO booking_payments (tenant_id, booking_id, amount_cents, method, note, stripe_ref) VALUES (${tenantId}, ${referenceId}, ${-take}, 'card refund', 'Refunded to the customer''s card', ${result.refund.id})`;
    }
    toCard += take;
    remaining -= take;
  }
  return { toCardCents: toCard };
}
