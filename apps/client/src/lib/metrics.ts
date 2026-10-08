import type { Booking, Order } from '../types';

/** Orders whose payment actually went through ('pending' ones are unfinished checkouts). */
export const isPaidOrder = (o: Order) => o.status === 'paid' || o.status === 'fulfilled';

/** Bookings that are real appointments: not unpaid attempts, cancelled or no-shows. */
export const isLiveBooking = (b: Booking) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'completed';

export const isUnpaidBooking = (b: Booking) => b.status === 'awaiting_payment';
export const isUnpaidOrder = (o: Order) => o.status === 'pending';

/** Money actually collected on a booking (deposits and balances paid through Stripe). */
export const bookingCollectedCents = (b: Booking) =>
  b.status === 'cancelled' || b.status === 'awaiting_payment' ? 0 : b.deposit_paid_cents ?? 0;

export interface MoneyEvent {
  at: Date;
  cents: number;
}

/** Every payment received, from paid orders and bookings, dated when the order / booking was made. */
export function moneyEvents(orders: Order[], bookings: Booking[]): MoneyEvent[] {
  return [
    ...orders.filter(isPaidOrder).map((o) => ({ at: new Date(o.created_at), cents: o.total_cents })),
    ...bookings.filter((b) => bookingCollectedCents(b) > 0).map((b) => ({ at: new Date(b.created_at), cents: bookingCollectedCents(b) })),
  ];
}

export const sumBetween = (events: MoneyEvent[], from: Date, to: Date) =>
  events.filter((e) => e.at >= from && e.at < to).reduce((s, e) => s + e.cents, 0);
