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

/** Calendar day ("YYYY-MM-DD") of an instant in the store's timezone (falls back to the browser's). */
export function dayKey(d: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
}

/** The last n calendar days in the store's timezone, oldest first, as day keys. */
export function lastDayKeys(n: number, timeZone?: string): string[] {
  const [y, m, d] = dayKey(new Date(), timeZone).split('-').map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10));
}

export const sumOnDay = (events: MoneyEvent[], key: string, timeZone?: string) =>
  events.filter((e) => dayKey(e.at, timeZone) === key).reduce((s, e) => s + e.cents, 0);

/** Format money in the store's currency. */
export function formatMoney(cents: number, currency?: string | null): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  }
}
