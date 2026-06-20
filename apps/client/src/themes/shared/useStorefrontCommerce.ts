import { useRef, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import type { AvailableSlot, CartItem, ProductData, ServiceData } from '../types';

interface OrderResponse {
  order: { id: string; order_number: string };
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface BookingResponse {
  booking: { id: string };
}

interface PaymentIntentResponse {
  client_secret: string;
  amount: number;
}

interface AvailabilityResponse {
  slots: { start: string; end: string }[];
}

function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useStorefrontCommerce(slug: string | undefined) {
  // Cart / checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'payment' | 'success' | 'error'>('idle');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderClientSecret, setOrderClientSecret] = useState<string | null>(null);
  const [orderAmountCents, setOrderAmountCents] = useState(0);

  function addToCart(product: ProductData) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          quantity: 1,
          imageUrl: product.imageUrls?.[0],
          requiresShipping: product.requiresShipping ?? true,
        },
      ];
    });
    setCartOpen(true);
  }

  function updateCartQuantity(productId: string, quantity: number) {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  function openCheckout() {
    if (cart.length === 0) return;
    setOrderStatus('idle');
    setOrderError(null);
    setCheckoutOpen(true);
  }

  function closeCheckout() {
    setCheckoutOpen(false);
    setOrderStatus('idle');
    setOrderError(null);
  }

  async function submitOrder(info: { name: string; email: string; phone: string; shippingAddress?: ShippingAddress }) {
    if (!slug || cart.length === 0) return;
    setOrderStatus('submitting');
    setOrderError(null);
    try {
      const res = await apiPost<OrderResponse>(`/api/public/${slug}/orders`, {
        customer_name: info.name,
        customer_email: info.email,
        customer_phone: info.phone || null,
        items: cart.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        shipping_address: info.shippingAddress ?? null,
      });
      setOrderNumber(res.order.order_number);
      const pi = await apiPost<PaymentIntentResponse>('/api/stripe/payment-intent', {
        reference_type: 'order',
        reference_id: res.order.id,
      });
      setOrderClientSecret(pi.client_secret);
      setOrderAmountCents(pi.amount);
      setOrderStatus('payment');
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to place order');
      setOrderStatus('error');
    }
  }

  function confirmOrderPayment() {
    setOrderStatus('success');
    setCart([]);
  }

  function cancelOrderPayment() {
    setOrderStatus('error');
    setOrderError('Payment was not completed. Your order has been placed but not paid yet.');
  }

  // Booking
  const [bookingService, setBookingService] = useState<ServiceData | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'payment' | 'success' | 'error'>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingClientSecret, setBookingClientSecret] = useState<string | null>(null);
  const [bookingAmountCents, setBookingAmountCents] = useState(0);
  const slotMapRef = useRef<Map<string, { start: string; end: string }>>(new Map());

  function openBooking(service: ServiceData) {
    setBookingService(service);
    setBookingOpen(true);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setBookingStatus('idle');
    setBookingError(null);
  }

  function closeBooking() {
    setBookingOpen(false);
  }

  function dismissBookingStatus() {
    setBookingStatus('idle');
    setBookingError(null);
  }

  async function selectBookingDate(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setAvailableSlots([]);
    if (!slug || !bookingService) return;
    try {
      const res = await apiGet<AvailabilityResponse>(
        `/api/public/${slug}/availability?service_id=${bookingService.id}&date=${toDateParam(date)}`
      );
      const map = new Map<string, { start: string; end: string }>();
      const slots: AvailableSlot[] = (res.slots ?? []).map((s) => {
        const time = new Date(s.start).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        });
        map.set(time, s);
        return { time, available: true };
      });
      slotMapRef.current = map;
      setAvailableSlots(slots);
    } catch {
      setAvailableSlots([]);
    }
  }

  function selectBookingSlot(time: string) {
    setSelectedSlot(time);
  }

  async function confirmBooking(info: { name: string; email: string; phone: string }) {
    if (!slug || !bookingService || !selectedSlot) return;
    const slot = slotMapRef.current.get(selectedSlot);
    if (!slot) return;
    setBookingStatus('submitting');
    setBookingError(null);
    try {
      const res = await apiPost<BookingResponse>(`/api/public/${slug}/bookings`, {
        service_id: bookingService.id,
        customer_name: info.name,
        customer_email: info.email,
        customer_phone: info.phone || null,
        start_time: slot.start,
        end_time: slot.end,
      });
      const pi = await apiPost<PaymentIntentResponse>('/api/stripe/payment-intent', {
        reference_type: 'booking',
        reference_id: res.booking.id,
      });
      setBookingClientSecret(pi.client_secret);
      setBookingAmountCents(pi.amount);
      setBookingStatus('payment');
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to book');
      setBookingStatus('error');
    }
  }

  function confirmBookingPayment() {
    setBookingStatus('success');
  }

  function cancelBookingPayment() {
    setBookingStatus('error');
    setBookingError('Payment was not completed. Please try booking again.');
  }

  return {
    cart,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    checkoutOpen,
    openCheckout,
    closeCheckout,
    orderStatus,
    orderError,
    orderNumber,
    orderClientSecret,
    orderAmountCents,
    submitOrder,
    confirmOrderPayment,
    cancelOrderPayment,

    bookingService,
    bookingOpen,
    openBooking,
    closeBooking,
    selectedDate,
    selectedSlot,
    availableSlots,
    selectBookingDate,
    selectBookingSlot,
    bookingStatus,
    bookingError,
    bookingClientSecret,
    bookingAmountCents,
    confirmBooking,
    confirmBookingPayment,
    cancelBookingPayment,
    dismissBookingStatus,
  };
}
