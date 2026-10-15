import { checkFirstSale } from './milestones';
import { db } from '../db/client';
import { getBaseUrl } from '../lib/baseUrl';
import { formatBookingTime } from '../lib/time';
import { stripe, computePlatformFee } from './stripe';
import { STRIPE_CARD_FEE } from './chargeModel';
import { manageUrlFor } from './bookingManage';
import { holdsTime } from './slots';
import {
  sendOrderConfirmation, sendTenantNewOrder,
  sendBookingConfirmation, sendTenantNewBooking,
} from './email';

export interface SucceededPayment {
  id: string;
  amount: number;
  customer: string | null;
  payment_method: string | null;
  metadata: Record<string, string>;
}

/** Tell the customer their booking is confirmed and the owner about the new booking (sent once, when it is paid). */
async function notifyBookingPaid(booking: Record<string, unknown>, tenantId: string) {
  const baseUrl = getBaseUrl();
  const svcRow = await db`SELECT name FROM services WHERE id = ${booking.service_id as string} LIMIT 1`;
  const tenantRows = await db`SELECT t.*, u.email AS owner_email FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${tenantId} LIMIT 1`;
  const t = tenantRows[0];
  const serviceName = (svcRow[0]?.name as string) ?? 'your appointment';
  const startFmt = formatBookingTime(booking.start_time as string, t?.timezone as string);
  const endFmt = formatBookingTime(booking.end_time as string, t?.timezone as string);
  const manageUrl = t ? await manageUrlFor(t, booking.id as string) : undefined;
  Promise.all([
    sendBookingConfirmation({
      toEmail: booking.customer_email as string,
      toName: booking.customer_name as string,
      serviceName,
      startTime: startFmt,
      endTime: endFmt,
      companyName: (t?.company_name as string) ?? '',
    }).catch(() => {}),
    t?.owner_email
      ? sendTenantNewBooking({
          tenantEmail: t.owner_email as string,
          companyName: t.company_name as string,
          serviceName,
          customerName: booking.customer_name as string,
          customerEmail: booking.customer_email as string,
          startTime: startFmt,
          endTime: endFmt,
          dashboardUrl: `${baseUrl}/dashboard/bookings`,
        }).catch(() => {})
      : Promise.resolve(),
  ]).catch(() => {});
}

/**
 * A customer's payment went through: mark the order / booking paid, record it in the ledger, send the emails.
 * Safe to call more than once for the same payment (a payment already in the ledger is skipped), and from either
 * Stripe's webhook or our own check against Stripe, so a missed webhook never leaves a paid booking unconfirmed.
 */
export async function applySucceededPayment(
  pi: SucceededPayment,
  connectAccount?: string,
): Promise<'applied' | 'duplicate'> {
  const { reference_type, reference_id, tenant_id } = pi.metadata || {};

  // Stripe retries webhooks (and a payment can be reported twice): a payment already in the ledger is done
  const already = await db`SELECT 1 FROM platform_transactions WHERE stripe_transfer_id = ${pi.id} LIMIT 1`;
  if (already[0]) return 'duplicate';

  if (pi.customer && pi.payment_method) {
    try {
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method, connectAccount ? { stripeAccount: connectAccount } : undefined);
      await db`
        UPDATE customers
        SET stripe_payment_method_id = ${pi.payment_method}, card_brand = ${pm.card?.brand ?? null}, card_last4 = ${pm.card?.last4 ?? null}, updated_at = NOW()
        WHERE stripe_customer_id = ${pi.customer} AND stripe_account_id IS NOT DISTINCT FROM ${connectAccount ?? null}
      `;
    } catch {
      // best-effort card-on-file save
    }
  }

  const baseUrl = getBaseUrl();

  if (reference_type === 'order') {
    const rows = await db`
      UPDATE orders SET status = 'paid', stripe_charge_id = ${pi.id}, updated_at = NOW()
      WHERE id = ${reference_id} RETURNING *
    `;
    const order = rows[0];
    if (order) {
      // A discount code counts as used once the order is actually paid (not when checkout merely started)
      if (order.discount_code_id) await db`UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = ${order.discount_code_id as string}`;
      const platformFee = order.platform_fee_cents as number;
      const stripeFee = Math.round((order.total_cents as number) * STRIPE_CARD_FEE.percent) + STRIPE_CARD_FEE.fixedCents;
      await db`
        INSERT INTO platform_transactions (
          tenant_id, reference_id, reference_type, gross_amount_cents,
          platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id
        ) VALUES (
          ${tenant_id}, ${reference_id}, 'order', ${order.total_cents},
          ${platformFee}, ${stripeFee}, ${(order.total_cents as number) - platformFee - stripeFee}, ${pi.id}
        )
        ON CONFLICT (stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL DO NOTHING
      `;
      // Notify customer and tenant
      const tenantRows = await db`SELECT t.company_name, u.email AS owner_email FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${tenant_id} LIMIT 1`;
      const t = tenantRows[0];
      Promise.all([
        sendOrderConfirmation({
          toEmail: order.customer_email as string,
          toName: order.customer_name as string,
          orderNumber: order.order_number as string,
          totalCents: order.total_cents as number,
          companyName: (t?.company_name as string) ?? '',
        }).catch(() => {}),
        t?.owner_email
          ? sendTenantNewOrder({
              tenantEmail: t.owner_email as string,
              companyName: t.company_name as string,
              orderNumber: order.order_number as string,
              customerName: order.customer_name as string,
              customerEmail: order.customer_email as string,
              totalCents: order.total_cents as number,
              dashboardUrl: `${baseUrl}/dashboard/orders`,
            }).catch(() => {})
          : Promise.resolve(),
      ]).catch(() => {});
    }
  } else if (reference_type === 'booking_balance') {
    const piAmount = pi.amount;
    const prior = await db`SELECT status FROM bookings WHERE id = ${reference_id} LIMIT 1`;
    const wasUnpaid = prior[0]?.status === 'awaiting_payment';
    // Paying an unpaid attempt (e.g. via the emailed payment link) is what confirms it
    const rows = await db`
      UPDATE bookings
      SET deposit_paid_cents = COALESCE(deposit_paid_cents, 0) + ${piAmount},
          status = CASE WHEN status = 'awaiting_payment' THEN 'confirmed' ELSE status END,
          updated_at = NOW()
      WHERE id = ${reference_id} RETURNING *
    `;
    const booking = rows[0];
    if (booking) {
      if (wasUnpaid) await notifyBookingPaid(booking, tenant_id);
      const platformFee = await computePlatformFee(piAmount, booking.tenant_id as string);
      const stripeFee = Math.round(piAmount * STRIPE_CARD_FEE.percent) + STRIPE_CARD_FEE.fixedCents;
      await db`
        INSERT INTO platform_transactions (
          tenant_id, reference_id, reference_type, gross_amount_cents,
          platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id
        ) VALUES (
          ${tenant_id}, ${reference_id}, 'booking', ${piAmount},
          ${platformFee}, ${stripeFee}, ${piAmount - platformFee - stripeFee}, ${pi.id}
        )
        ON CONFLICT (stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL DO NOTHING
      `;
    }
  } else if (reference_type === 'booking') {
    const piAmount = (pi as unknown as { amount: number }).amount;
    const rows = await db`
      UPDATE bookings
      SET status = 'confirmed', stripe_payment_intent_id = ${pi.id}, deposit_paid_cents = ${piAmount}, updated_at = NOW()
      WHERE id = ${reference_id} RETURNING *
    `;
    const booking = rows[0];
    if (booking) {
      const platformFee = booking.platform_fee_cents as number;
      const stripeFee = Math.round(piAmount * STRIPE_CARD_FEE.percent) + STRIPE_CARD_FEE.fixedCents;
      await db`
        INSERT INTO platform_transactions (
          tenant_id, reference_id, reference_type, gross_amount_cents,
          platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id
        ) VALUES (
          ${tenant_id}, ${reference_id}, 'booking', ${piAmount},
          ${platformFee}, ${stripeFee}, ${piAmount - platformFee - stripeFee}, ${pi.id}
        )
        ON CONFLICT (stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL DO NOTHING
      `;
      // The time may have been released while the payment was pending (an unpaid hold lasts 30 minutes). If someone
      // else has the time now, keep the paid booking but flag it so the owner sorts it out.
      const staffId = (booking.staff_id as string | null) ?? null;
      const clash = await db`
        SELECT 1 FROM bookings
        WHERE tenant_id = ${booking.tenant_id as string} AND id <> ${booking.id as string} AND ${holdsTime()}
          AND (${staffId}::uuid IS NULL OR staff_id = ${staffId}::uuid OR staff_id IS NULL)
          AND start_time < ${booking.end_time as string} AND end_time > ${booking.start_time as string}
        LIMIT 1
      `;
      if (clash[0]) {
        await db`
          UPDATE bookings
          SET internal_notes = COALESCE(internal_notes || E'\n', '') || 'WARNING: another appointment overlaps this time (the slot was released before this payment arrived). Please contact the customer.'
          WHERE id = ${booking.id as string}
        `;
      }
      await notifyBookingPaid(booking, tenant_id);
    }
  }
  // The store's first sale: celebrate it with a flyer (never blocks or fails the payment)
  if ((reference_type === 'order' || reference_type === 'booking') && reference_id && tenant_id) {
    checkFirstSale(tenant_id, reference_type, reference_id).catch((err) => console.error('First-sale milestone error:', err));
  }
  return 'applied';
}
