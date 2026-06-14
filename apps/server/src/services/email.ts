const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER = { name: 'Onvicove', email: 'no-reply@onvicove.com' };

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

async function sendTransacEmail(payload: {
  to: { email: string; name: string }[];
  subject: string;
  htmlContent: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is required');
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: SENDER,
      ...payload,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${text}`);
  }
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Booking confirmed — ${data.companyName}`,
    htmlContent: `
      <h2>Your booking is confirmed!</h2>
      <p>Hi ${data.toName},</p>
      <p>Your appointment for <strong>${data.serviceName}</strong> with ${data.companyName} is confirmed.</p>
      <p><strong>Start:</strong> ${data.startTime}</p>
      <p><strong>End:</strong> ${data.endTime}</p>
      <p>Thank you!</p>
    `,
  });
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Order confirmed — ${data.orderNumber}`,
    htmlContent: `
      <h2>Thank you for your order!</h2>
      <p>Hi ${data.toName},</p>
      <p>Your order <strong>${data.orderNumber}</strong> with ${data.companyName} has been received.</p>
      <p><strong>Total:</strong> $${(data.totalCents / 100).toFixed(2)}</p>
      <p>We'll notify you when it ships.</p>
    `,
  });
}

export async function sendBookingReminder(data: BookingEmailData): Promise<void> {
  await sendTransacEmail({
    to: [{ email: data.toEmail, name: data.toName }],
    subject: `Reminder: upcoming appointment — ${data.companyName}`,
    htmlContent: `
      <h2>Appointment reminder</h2>
      <p>Hi ${data.toName},</p>
      <p>This is a reminder for your upcoming appointment for <strong>${data.serviceName}</strong> with ${data.companyName}.</p>
      <p><strong>Start:</strong> ${data.startTime}</p>
      <p><strong>End:</strong> ${data.endTime}</p>
      <p>See you soon!</p>
    `,
  });
}
