import { db } from '../db/client';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER = {
  name: process.env.BREVO_SENDER_NAME || 'Shop Suite Direct',
  email: process.env.BREVO_SENDER_EMAIL || 'no-reply@shopsuitedirect.com',
};

function adminEmail(): string | null {
  return process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || null;
}

function btn(text: string, url: string) {
  return `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;padding:12px 24px;background:#111111;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">${text}</a></p>`;
}

function wrap(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:32px 16px">
    <p style="font-weight:700;font-size:18px;margin-bottom:24px">Shop Suite Direct</p>
    <h2 style="font-size:22px;margin-bottom:16px">${title}</h2>
    ${body}
    <hr style="margin-top:40px;border:none;border-top:1px solid #e2e8f0"/>
    <p style="font-size:12px;color:#94a3b8;margin-top:16px">Shop Suite Direct · You're receiving this because you have an account with us.</p>
  </body></html>`;
}

interface EmailMeta {
  tenantId?: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
}

export async function sendTransacEmail(payload: {
  to: { email: string; name: string }[];
  subject: string;
  htmlContent: string;
  replyTo?: { email: string };
}, meta?: EmailMeta): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY environment variable is required');

  let sendError: string | null = null;

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({ sender: SENDER, ...payload }),
  });

  if (!response.ok) {
    const text = await response.text();
    sendError = `Brevo API error (${response.status}): ${text}`;
  }

  if (meta?.tenantId && meta.type) {
    const recipient = payload.to[0];
    db`
      INSERT INTO email_log (tenant_id, type, to_email, to_name, subject, html_content, status, error_message, reference_type, reference_id)
      VALUES (
        ${meta.tenantId}, ${meta.type}, ${recipient.email}, ${recipient.name ?? null},
        ${payload.subject}, ${payload.htmlContent},
        ${sendError ? 'failed' : 'sent'}, ${sendError ?? null},
        ${meta.referenceType ?? null}, ${meta.referenceId ? meta.referenceId : null}
      )
    `.catch((err: unknown) => console.error('email_log insert error:', err));
  }

  if (sendError) throw new Error(sendError);
}

// ─── Tenant lifecycle ────────────────────────────────────────────────────────

export async function sendTenantWelcome(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  dashboardUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Welcome to Shop Suite Direct, ${data.toName.split(' ')[0]}!`,
    htmlContent: wrap('Your account is ready 🎉', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Welcome to Shop Suite Direct! Your business <strong>${data.companyName}</strong> is set up and ready to go.</p>
      <p>Here's what to do next:</p>
      <ol style="line-height:2">
        <li>Connect your Stripe account so you can accept payments</li>
        <li>Add your products or services</li>
        <li>Share your storefront link with customers</li>
      </ol>
      ${btn('Go to Dashboard', data.dashboardUrl)}
    `),
  });
}

export async function sendSiteLive(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  storefrontUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Your ${data.companyName} storefront is live!`,
    htmlContent: wrap('Your site is live', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Your <strong>${data.companyName}</strong> storefront is now live and accepting visitors.</p>
      ${btn('View your storefront', data.storefrontUrl)}
      <p style="font-size:13px;color:#64748b">Share this link with your customers to start getting orders and bookings.</p>
    `),
  });
}

export async function sendPlanUpgraded(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  newPlan: string;
  dashboardUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `You're now on the ${data.newPlan} plan`,
    htmlContent: wrap(`Upgraded to ${data.newPlan}`, `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Your <strong>${data.companyName}</strong> account has been upgraded to the <strong>${data.newPlan}</strong> plan.</p>
      <p>Your new limits and features are active immediately.</p>
      ${btn('View your dashboard', data.dashboardUrl)}
    `),
  });
}

export async function sendPlanDowngraded(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  newPlan: string;
  dashboardUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Your plan has changed — ${data.companyName}`,
    htmlContent: wrap('Plan change notice', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Your <strong>${data.companyName}</strong> account has been moved to the <strong>${data.newPlan}</strong> plan.</p>
      <p>Some features or item limits may have changed. Log in to review your account.</p>
      ${btn('Go to dashboard', data.dashboardUrl)}
      <p style="font-size:13px;color:#64748b">Questions? Reply to this email and we'll help.</p>
    `),
  });
}

export async function sendAccountSuspended(data: {
  toEmail: string;
  toName: string;
  companyName: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Your Shop Suite Direct account has been paused`,
    htmlContent: wrap('Account paused', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Your <strong>${data.companyName}</strong> account has been temporarily paused by our team.</p>
      <p>Your storefront is not currently visible to customers.</p>
      <p>Please reply to this email if you have questions or believe this is an error.</p>
    `),
  });
}

// ─── Stripe nudges ───────────────────────────────────────────────────────────

export async function sendStripeNudge(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  connectUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Connect Stripe to start accepting payments — ${data.companyName}`,
    htmlContent: wrap('One step left: connect Stripe', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Your <strong>${data.companyName}</strong> storefront is live, but you haven't connected a Stripe account yet — so you can't receive payments from customers.</p>
      <p>It only takes a few minutes to set up.</p>
      ${btn('Connect Stripe now', data.connectUrl)}
      <p style="font-size:13px;color:#64748b">Stripe is free to connect. Shop Suite Direct takes a small platform fee per transaction — see your dashboard for details.</p>
    `),
  });
}

export async function sendStripeReminder(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  connectUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Reminder: you still can't get paid — ${data.companyName}`,
    htmlContent: wrap('Still waiting on Stripe', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>It's been a few days and <strong>${data.companyName}</strong> still doesn't have a connected Stripe account.</p>
      <p>Without it, customers can browse your storefront but can't complete purchases or bookings.</p>
      ${btn('Connect Stripe', data.connectUrl)}
      <p style="font-size:13px;color:#64748b">Need help? Reply to this email.</p>
    `),
  });
}

export async function sendStripeConnected(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  dashboardUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Stripe connected — you're ready to accept payments`,
    htmlContent: wrap('You\'re ready to get paid!', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Your Stripe account is connected to <strong>${data.companyName}</strong>. Payments from customers will be deposited directly to your bank account.</p>
      ${btn('Go to dashboard', data.dashboardUrl)}
    `),
  });
}

// ─── Customer transactional ──────────────────────────────────────────────────

interface BookingEmailData {
  toEmail: string;
  toName: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  companyName: string;
  tenantId?: string;
  bookingId?: string;
}

interface OrderEmailData {
  toEmail: string;
  toName: string;
  orderNumber: string;
  totalCents: number;
  companyName: string;
  tenantId?: string;
  orderId?: string;
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Booking confirmed — ${data.companyName}`,
    htmlContent: wrap('Your booking is confirmed!', `
      <p>Hi ${data.toName},</p>
      <p>Your appointment for <strong>${data.serviceName}</strong> with <strong>${data.companyName}</strong> is confirmed.</p>
      <p><strong>Start:</strong> ${data.startTime}</p>
      <p><strong>End:</strong> ${data.endTime}</p>
      <p>Thank you — we look forward to seeing you!</p>
    `),
  }, data.tenantId ? { tenantId: data.tenantId, type: 'booking_confirmation', referenceType: 'booking', referenceId: data.bookingId } : undefined);
}

export async function sendBookingReminder(data: BookingEmailData): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Reminder: appointment tomorrow — ${data.companyName}`,
    htmlContent: wrap('Appointment reminder', `
      <p>Hi ${data.toName},</p>
      <p>This is a reminder for your upcoming appointment for <strong>${data.serviceName}</strong> with <strong>${data.companyName}</strong>.</p>
      <p><strong>Start:</strong> ${data.startTime}</p>
      <p><strong>End:</strong> ${data.endTime}</p>
      <p>See you soon!</p>
    `),
  }, data.tenantId ? { tenantId: data.tenantId, type: 'booking_reminder', referenceType: 'booking', referenceId: data.bookingId } : undefined);
}

export async function sendBookingCancelled(data: BookingEmailData): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Appointment cancelled — ${data.companyName}`,
    htmlContent: wrap('Your appointment has been cancelled', `
      <p>Hi ${data.toName},</p>
      <p>Your appointment for <strong>${data.serviceName}</strong> with <strong>${data.companyName}</strong> has been cancelled.</p>
      <p>If you'd like to rebook or have questions, please contact ${data.companyName} directly.</p>
    `),
  }, data.tenantId ? { tenantId: data.tenantId, type: 'booking_cancelled', referenceType: 'booking', referenceId: data.bookingId } : undefined);
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Order confirmed — ${data.orderNumber}`,
    htmlContent: wrap('Thank you for your order!', `
      <p>Hi ${data.toName},</p>
      <p>Your order <strong>${data.orderNumber}</strong> with <strong>${data.companyName}</strong> has been received.</p>
      <p><strong>Total:</strong> $${(data.totalCents / 100).toFixed(2)}</p>
      <p>We'll send you a shipping confirmation with tracking info once your order is on its way.</p>
    `),
  }, data.tenantId ? { tenantId: data.tenantId, type: 'order_confirmation', referenceType: 'order', referenceId: data.orderId } : undefined);
}

export async function sendOrderShipped(data: {
  toEmail: string;
  toName: string;
  orderNumber: string;
  companyName: string;
  trackingNumber: string;
  trackingUrl: string | null;
}): Promise<void> {
  const trackingBlock = data.trackingUrl
    ? `${btn('Track your shipment', data.trackingUrl)}<p style="font-size:13px;color:#64748b">Or use tracking number: <strong>${data.trackingNumber}</strong></p>`
    : `<p><strong>Tracking number:</strong> ${data.trackingNumber}</p>`;

  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Your order has shipped — ${data.orderNumber}`,
    htmlContent: wrap('Your order is on its way!', `
      <p>Hi ${data.toName},</p>
      <p>Good news! Your order <strong>${data.orderNumber}</strong> from <strong>${data.companyName}</strong> has shipped.</p>
      ${trackingBlock}
    `),
  });
}

export async function sendOrderRefunded(data: {
  toEmail: string;
  toName: string;
  orderNumber: string;
  totalCents: number;
  companyName: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Refund processed — ${data.orderNumber}`,
    htmlContent: wrap('Your refund has been processed', `
      <p>Hi ${data.toName},</p>
      <p>Your refund of <strong>$${(data.totalCents / 100).toFixed(2)}</strong> for order <strong>${data.orderNumber}</strong> with <strong>${data.companyName}</strong> has been processed.</p>
      <p>Funds typically appear in your account within 5–10 business days depending on your bank.</p>
    `),
  });
}

export async function sendBookingRefunded(data: {
  toEmail: string;
  toName: string;
  serviceName: string;
  amountCents: number;
  companyName: string;
  tenantId?: string;
  bookingId?: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Refund processed — ${data.companyName}`,
    htmlContent: wrap('Your refund has been processed', `
      <p>Hi ${data.toName},</p>
      <p>Your payment of <strong>$${(data.amountCents / 100).toFixed(2)}</strong> for <strong>${data.serviceName}</strong> with <strong>${data.companyName}</strong> has been refunded.</p>
      <p>Funds typically appear in your account within 5–10 business days depending on your bank.</p>
    `),
  }, data.tenantId ? { tenantId: data.tenantId, type: 'booking_refunded', referenceType: 'booking', referenceId: data.bookingId } : undefined);
}

interface PaymentLinkEmailData {
  toEmail: string;
  toName: string;
  serviceName: string;
  amountCents: number;
  companyName: string;
  bookingId: string;
  tenantId?: string;
}

export async function sendPaymentLinkEmail(data: PaymentLinkEmailData): Promise<void> {
  const baseUrl = process.env.CLIENT_URL || 'https://shopsuitedirect.com';
  const payUrl = `${baseUrl}/pay/booking/${data.bookingId}`;
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Payment requested — ${data.companyName}`,
    htmlContent: wrap('Remaining balance due', `
      <p>Hi ${data.toName},</p>
      <p>Thanks for visiting <strong>${data.companyName}</strong>! Your <strong>${data.serviceName}</strong> appointment has a remaining balance of <strong>$${(data.amountCents / 100).toFixed(2)}</strong>.</p>
      ${btn('Pay now', payUrl)}
      <p style="font-size:13px;color:#64748b">Or copy this link: ${payUrl}</p>
    `),
  }, data.tenantId ? { tenantId: data.tenantId, type: 'payment_link', referenceType: 'booking', referenceId: data.bookingId } : undefined);
}

// ─── Admin notifications ─────────────────────────────────────────────────────

export async function sendAdminNewSignup(data: {
  companyName: string;
  ownerEmail: string;
  plan: string;
}): Promise<void> {
  const email = adminEmail();
  if (!email) return;
  await sendTransacEmail({
    to: [{ email, name: 'Shop Suite Direct Admin' }],
    subject: `New signup: ${data.companyName}`,
    htmlContent: wrap('New tenant signed up', `
      <p><strong>Company:</strong> ${data.companyName}</p>
      <p><strong>Owner email:</strong> ${data.ownerEmail}</p>
      <p><strong>Plan:</strong> ${data.plan}</p>
    `),
  });
}

export async function sendAdminStripeConnected(data: {
  companyName: string;
  ownerEmail: string;
}): Promise<void> {
  const email = adminEmail();
  if (!email) return;
  await sendTransacEmail({
    to: [{ email, name: 'Shop Suite Direct Admin' }],
    subject: `Stripe connected: ${data.companyName}`,
    htmlContent: wrap('Tenant connected Stripe', `
      <p><strong>Company:</strong> ${data.companyName}</p>
      <p><strong>Owner email:</strong> ${data.ownerEmail}</p>
    `),
  });
}

export async function sendAdminRefund(data: {
  companyName: string;
  referenceType: string;
  referenceId: string;
  amountCents: number;
}): Promise<void> {
  const email = adminEmail();
  if (!email) return;
  await sendTransacEmail({
    to: [{ email, name: 'Shop Suite Direct Admin' }],
    subject: `Refund processed: $${(data.amountCents / 100).toFixed(2)} — ${data.companyName}`,
    htmlContent: wrap('Refund processed', `
      <p><strong>Tenant:</strong> ${data.companyName}</p>
      <p><strong>Type:</strong> ${data.referenceType}</p>
      <p><strong>Reference ID:</strong> ${data.referenceId}</p>
      <p><strong>Amount:</strong> $${(data.amountCents / 100).toFixed(2)}</p>
    `),
  });
}

export async function sendAdminDomainPurchaseRequest(data: {
  companyName: string;
  ownerEmail: string;
  domain: string;
  requestId: string;
  adminUrl: string;
}): Promise<void> {
  const email = adminEmail();
  if (!email) return;
  await sendTransacEmail({
    to: [{ email, name: 'Shop Suite Direct Admin' }],
    subject: `Domain purchase request: ${data.domain} — ${data.companyName}`,
    htmlContent: wrap('New domain purchase request', `
      <p><strong>Domain requested:</strong> ${data.domain}</p>
      <p><strong>Tenant:</strong> ${data.companyName}</p>
      <p><strong>Owner email:</strong> ${data.ownerEmail}</p>
      <p>Purchase this domain at <a href="https://railway.com/domains">railway.com/domains</a>, attach it to the production service, then mark this request as purchased from the admin panel.</p>
      ${btn('View request in admin', data.adminUrl)}
    `),
  });
}

export async function sendTenantDomainRequestReceived(data: {
  toEmail: string;
  toName: string;
  domain: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Domain request received — ${data.domain}`,
    htmlContent: wrap('We received your domain request', `
      <p>Hi ${data.toName},</p>
      <p>We've received your request for <strong>${data.domain}</strong>.</p>
      <p>Our team will purchase and configure it for you — usually within 1 business day. We'll email you once it's live.</p>
      <p>Questions? Just reply to this email.</p>
    `),
  });
}

export async function sendTenantDomainPurchased(data: {
  toEmail: string;
  toName: string;
  domain: string;
  dashboardUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Your domain is live — ${data.domain}`,
    htmlContent: wrap('Your domain is ready', `
      <p>Hi ${data.toName},</p>
      <p>Your domain <strong>${data.domain}</strong> has been purchased and connected to your store. It's live now!</p>
      ${btn('Visit your store', `https://${data.domain}`)}
      <p>SSL is included and renews automatically. No action needed on your end.</p>
    `),
  });
}

// ─── Subscriber notifications ────────────────────────────────────────────────

export async function sendSubscriberWelcome(data: {
  toEmail: string;
  toName: string;
  companyName: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName || data.toEmail }],
    subject: `Thanks for subscribing to ${data.companyName}!`,
    htmlContent: wrap(`You're on the list!`, `
      <p>Hi${data.toName ? ` ${data.toName.split(' ')[0]}` : ''},</p>
      <p>Thanks for subscribing to <strong>${data.companyName}</strong>. You'll be the first to hear about new products, offers, and updates.</p>
      <p style="font-size:13px;color:#64748b">If you didn't subscribe, you can safely ignore this email.</p>
    `),
  });
}

export async function sendTenantNewSubscriber(data: {
  tenantEmail: string;
  companyName: string;
  subscriberEmail: string;
  subscriberName: string | null;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.tenantEmail, name: data.companyName }],
    subject: `New subscriber — ${data.companyName}`,
    htmlContent: wrap('Someone joined your list', `
      <p>A new customer subscribed to your email list on <strong>${data.companyName}</strong>.</p>
      <p><strong>Email:</strong> ${data.subscriberEmail}</p>
      ${data.subscriberName ? `<p><strong>Name:</strong> ${data.subscriberName}</p>` : ''}
    `),
  });
}

// ─── Tenant order / booking notifications ────────────────────────────────────

export async function sendTenantNewOrder(data: {
  tenantEmail: string;
  companyName: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  dashboardUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.tenantEmail, name: data.companyName }],
    subject: `New order — ${data.orderNumber}`,
    htmlContent: wrap('You got an order!', `
      <p>A new order was placed on <strong>${data.companyName}</strong>.</p>
      <p><strong>Order #:</strong> ${data.orderNumber}</p>
      <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
      <p><strong>Total:</strong> $${(data.totalCents / 100).toFixed(2)}</p>
      ${btn('View order', data.dashboardUrl)}
    `),
  });
}

export async function sendTenantNewBooking(data: {
  tenantEmail: string;
  companyName: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  startTime: string;
  endTime: string;
  dashboardUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.tenantEmail, name: data.companyName }],
    subject: `New booking — ${data.serviceName}`,
    htmlContent: wrap('New appointment booked', `
      <p>A new booking was made on <strong>${data.companyName}</strong>.</p>
      <p><strong>Service:</strong> ${data.serviceName}</p>
      <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
      <p><strong>Start:</strong> ${data.startTime}</p>
      <p><strong>End:</strong> ${data.endTime}</p>
      ${btn('View booking', data.dashboardUrl)}
    `),
  });
}

// ─── Payment failure ─────────────────────────────────────────────────────────

export async function sendPaymentFailed(data: {
  toEmail: string;
  toName: string;
  companyName: string;
  amountCents: number;
  retryUrl: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Payment failed — ${data.companyName}`,
    htmlContent: wrap('Your payment could not be processed', `
      <p>Hi ${data.toName},</p>
      <p>Unfortunately we couldn't process your payment of <strong>$${(data.amountCents / 100).toFixed(2)}</strong> for <strong>${data.companyName}</strong>.</p>
      <p>This can happen if your card was declined, expired, or has insufficient funds. Please try again with a different payment method.</p>
      ${btn('Try again', data.retryUrl)}
      <p style="font-size:13px;color:#64748b">If you continue to have trouble, contact ${data.companyName} directly.</p>
    `),
  });
}

// ─── Booking awaiting payment ────────────────────────────────────────────────

export async function sendBookingAwaitingPayment(data: {
  toEmail: string;
  toName: string;
  serviceName: string;
  amountCents: number;
  companyName: string;
  bookingId: string;
  startTime: string;
}): Promise<void> {
  const baseUrl = process.env.CLIENT_URL || 'https://shopsuitedirect.com';
  const payUrl = `${baseUrl}/pay/booking/${data.bookingId}`;
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Complete your booking — ${data.companyName}`,
    htmlContent: wrap('One step left to confirm your booking', `
      <p>Hi ${data.toName},</p>
      <p>Your appointment for <strong>${data.serviceName}</strong> with <strong>${data.companyName}</strong> on <strong>${data.startTime}</strong> is reserved but not yet confirmed.</p>
      <p>Please complete your payment of <strong>$${(data.amountCents / 100).toFixed(2)}</strong> to lock in your spot.</p>
      ${btn('Pay now to confirm', payUrl)}
      <p style="font-size:13px;color:#64748b">Your spot is not guaranteed until payment is received.</p>
    `),
  });
}

// ─── Custom order requests ───────────────────────────────────────────────────

export async function sendCustomOrderNotification(data: {
  tenantEmail: string;
  tenantName: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  message: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.tenantEmail, name: data.companyName }],
    subject: `New custom order request from ${data.customerName}`,
    htmlContent: wrap('New custom order request', `
      <p>Hi,</p>
      <p>Someone has submitted a custom order request through your <strong>${data.companyName}</strong> storefront.</p>
      <p><strong>Name:</strong> ${data.customerName}</p>
      <p><strong>Email:</strong> ${data.customerEmail}</p>
      <p><strong>Message:</strong></p>
      <p style="background:#f8fafc;border-left:4px solid #e2e8f0;padding:12px 16px;border-radius:4px">${data.message}</p>
      <p style="font-size:13px;color:#64748b">Reply directly to the customer at ${data.customerEmail} to follow up.</p>
    `),
    replyTo: { email: data.customerEmail },
  });
}

export async function sendCustomOrderConfirmation(data: {
  customerEmail: string;
  customerName: string;
  companyName: string;
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.customerEmail, name: data.customerName }],
    subject: `We received your custom order request — ${data.companyName}`,
    htmlContent: wrap('We got your request!', `
      <p>Hi ${data.customerName},</p>
      <p>Thank you for reaching out to <strong>${data.companyName}</strong>! We've received your custom order request and will be in touch with you soon.</p>
      <p style="font-size:13px;color:#64748b">If you have any additional details to share, just reply to this email.</p>
    `),
  });
}
