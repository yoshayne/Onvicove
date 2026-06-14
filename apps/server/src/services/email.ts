import * as SibApiV3Sdk from '@sendinblue/client';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || ''
);

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

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.sender = SENDER;
  email.to = [{ email: data.toEmail, name: data.toName }];
  email.subject = `Booking confirmed — ${data.companyName}`;
  email.htmlContent = `
    <h2>Your booking is confirmed!</h2>
    <p>Hi ${data.toName},</p>
    <p>Your appointment for <strong>${data.serviceName}</strong> with ${data.companyName} is confirmed.</p>
    <p><strong>Start:</strong> ${data.startTime}</p>
    <p><strong>End:</strong> ${data.endTime}</p>
    <p>Thank you!</p>
  `;

  await apiInstance.sendTransacEmail(email);
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.sender = SENDER;
  email.to = [{ email: data.toEmail, name: data.toName }];
  email.subject = `Order confirmed — ${data.orderNumber}`;
  email.htmlContent = `
    <h2>Thank you for your order!</h2>
    <p>Hi ${data.toName},</p>
    <p>Your order <strong>${data.orderNumber}</strong> with ${data.companyName} has been received.</p>
    <p><strong>Total:</strong> $${(data.totalCents / 100).toFixed(2)}</p>
    <p>We'll notify you when it ships.</p>
  `;

  await apiInstance.sendTransacEmail(email);
}

export async function sendBookingReminder(data: BookingEmailData): Promise<void> {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.sender = SENDER;
  email.to = [{ email: data.toEmail, name: data.toName }];
  email.subject = `Reminder: upcoming appointment — ${data.companyName}`;
  email.htmlContent = `
    <h2>Appointment reminder</h2>
    <p>Hi ${data.toName},</p>
    <p>This is a reminder for your upcoming appointment for <strong>${data.serviceName}</strong> with ${data.companyName}.</p>
    <p><strong>Start:</strong> ${data.startTime}</p>
    <p><strong>End:</strong> ${data.endTime}</p>
    <p>See you soon!</p>
  `;

  await apiInstance.sendTransacEmail(email);
}
