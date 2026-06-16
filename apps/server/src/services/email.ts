const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER = {
  name: process.env.BREVO_SENDER_NAME || 'Onvicove',
  email: process.env.BREVO_SENDER_EMAIL || 'no-reply@onvicove.com',
};

function adminEmail(): string | null {
  return process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || null;
}

function btn(text: string, url: string) {
  return `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;padding:12px 24px;background:#111111;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">${text}</a></p>`;
}

function wrap(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:32px 16px">
    <p style="font-weight:700;font-size:18px;margin-bottom:24px">Onvicove</p>
    <h2 style="font-size:22px;margin-bottom:16px">${title}</h2>
    ${body}
    <hr style="margin-top:40px;border:none;border-top:1px solid #e2e8f0"/>
    <p style="font-size:12px;color:#94a3b8;margin-top:16px">Onvicove · You're receiving this because you have an account with us.</p>
  </body></html>`;
}

async function sendTransacEmail(payload: {
  to: { email: string; name: string }[];
  subject: string;
  htmlContent: string;
  replyTo?: { email: string };
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY environment variable is required');

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
    throw new Error(`Brevo API error (${response.status}): ${text}`);
  }
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
    subject: `Welcome to Onvicove, ${data.toName.split(' ')[0]}!`,
    htmlContent: wrap('Your account is ready 🎉', `
      <p>Hi ${data.toName.split(' ')[0]},</p>
      <p>Welcome to Onvicove! Your business <strong>${data.companyName}</strong> is set up and ready to go.</p>
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
    subject: `Your Onvicove account has been paused`,
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
      <p style="font-size:13px;color:#64748b">Stripe is free to connect. Onvicove takes a small platform fee per transaction — see your dashboard for details.</p>
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
}

interface OrderEmailData {
  toEmail: string;
  toName: string;
  orderNumber: string;
  totalCents: number;
  companyName: string;
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
  });
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
  });
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
  });
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
  });
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
}): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Refund processed — ${data.companyName}`,
    htmlContent: wrap('Your refund has been processed', `
      <p>Hi ${data.toName},</p>
      <p>Your payment of <strong>$${(data.amountCents / 100).toFixed(2)}</strong> for <strong>${data.serviceName}</strong> with <strong>${data.companyName}</strong> has been refunded.</p>
      <p>Funds typically appear in your account within 5–10 business days depending on your bank.</p>
    `),
  });
}

interface PaymentLinkEmailData {
  toEmail: string;
  toName: string;
  serviceName: string;
  amountCents: number;
  companyName: string;
  bookingId: string;
}

export async function sendPaymentLinkEmail(data: PaymentLinkEmailData): Promise<void> {
  const baseUrl = process.env.CLIENT_URL || 'https://onvicove.com';
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
  });
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
    to: [{ email, name: 'Onvicove Admin' }],
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
    to: [{ email, name: 'Onvicove Admin' }],
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
    to: [{ email, name: 'Onvicove Admin' }],
    subject: `Refund processed: $${(data.amountCents / 100).toFixed(2)} — ${data.companyName}`,
    htmlContent: wrap('Refund processed', `
      <p><strong>Tenant:</strong> ${data.companyName}</p>
      <p><strong>Type:</strong> ${data.referenceType}</p>
      <p><strong>Reference ID:</strong> ${data.referenceId}</p>
      <p><strong>Amount:</strong> $${(data.amountCents / 100).toFixed(2)}</p>
    `),
  });
}
