import { Bullets, ContactLine, LegalPage, Section } from './legal';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>Shop Suite Direct ("we", "us") provides tools that let small businesses build a website, sell products, take bookings and get paid. This policy explains what information we collect, why, and the choices you have. It covers both the business owners who use Shop Suite Direct ("store owners") and the customers who visit or buy from a store built on it.</p>

      <Section title="Two roles">
        <p><strong>For store owners</strong>, we are the company that provides your account and the platform, and we are responsible for the information described under "Information we collect from store owners".</p>
        <p><strong>For a store's customers</strong>, the store owner decides what customer information to collect and why. We process that information on the store owner's behalf to run the booking, ordering and payment features. If you are a customer and want to see or delete your information, please contact the business you booked with first.</p>
      </Section>

      <Section title="Information we collect from store owners">
        <Bullets items={[
          'Account details: your name, email address and sign-in information (sign-in is handled by our authentication provider, Clerk).',
          'Your store: business name, logo, photos, products, services, prices, hours, calendar settings and anything else you add to your site.',
          'Payment setup: your Stripe account connection and business details you provide to Stripe. We do not see or store your full bank details.',
          'Subscription billing: your plan and billing status. Card details are collected and held by Stripe, not by us.',
          'Usage and support information: actions in the dashboard, error logs, and messages you send us.',
        ]} />
      </Section>

      <Section title="Information about a store's customers">
        <p>When someone books or buys from a store, the store collects their name, email, optional phone number, what they booked or ordered, the time and amount, and any notes they add. Card payments are processed by Stripe; we receive confirmation of the payment, and we may keep the card brand and last four digits so the store can recognize a saved card. We do not store full card numbers.</p>
      </Section>

      <Section title="How we use information">
        <Bullets items={[
          'To provide, secure and improve the platform: showing stores, taking bookings and orders, processing payments and sending confirmations and reminders.',
          'To send service emails, such as booking confirmations, reminders, receipts, account and security notices. Store owners can also receive milestone messages, such as a congratulations on a first sale, and can turn these off in Settings.',
          'To prevent fraud and abuse, and to meet legal obligations.',
          'To provide AI features you choose to use (see below).',
        ]} />
      </Section>

      <Section title="AI features">
        <p>Some features use AI services. Product photos you choose to enhance, and photos or logos used to create promotional flyers, may be sent to an AI provider (Google) for processing. If you use the calendar assistant, the text of your request and a summary of your calendar settings are sent to an AI provider (Anthropic) so it can propose a change; nothing is changed until you confirm. We use these services only to deliver the feature to you.</p>
      </Section>

      <Section title="Who we share information with">
        <p>We do not sell personal information. We share it only with service providers that help us run the platform, under their own privacy and security terms, such as:</p>
        <Bullets items={[
          'Stripe, for payments and subscriptions.',
          'Clerk, for sign-in and account security.',
          'Our email delivery provider (Brevo), to send transactional emails.',
          'Cloud hosting and file storage providers, to run the platform and store uploaded images.',
          'AI providers (Google, Anthropic), only for the AI features described above.',
          'Google or Microsoft calendars, only if a store owner chooses to connect one.',
        ]} />
        <p>We may also disclose information if required by law, to protect people's safety or our rights, or as part of a business transfer such as a merger or sale.</p>
      </Section>

      <Section title="Cookies and similar technology">
        <p>We use cookies and local storage that are needed to keep you signed in, remember settings and keep the service secure. A store owner may add their own tools to their site, and those are governed by that business's own policies.</p>
      </Section>

      <Section title="How long we keep information">
        <p>We keep account and store information while your account is active. Payment and transaction records may be kept longer where needed for accounting, tax, fraud prevention or legal reasons. When you ask us to delete your account, we delete or de-identify your information within a reasonable time, except where we must keep it.</p>
      </Section>

      <Section title="Your choices and rights">
        <Bullets items={[
          'You can update your store and account information in your dashboard.',
          'You can ask us to access, correct or delete your information, or close your account.',
          'You can turn off optional milestone emails in Settings. You cannot opt out of essential service emails, such as booking confirmations.',
          'Customers should contact the business they booked with about their booking information. We will help the business respond.',
        ]} />
        <p>Depending on where you live (for example California or the EU/UK), you may have additional rights. We will honor valid requests as the law requires.</p>
      </Section>

      <Section title="Security">
        <p>We use reasonable technical and organizational measures to protect information, including encrypted connections and limiting who can access data. No system is perfectly secure, so we cannot guarantee absolute security.</p>
      </Section>

      <Section title="Children">
        <p>Shop Suite Direct is intended for businesses and is not directed to children under 13. We do not knowingly collect information from children under 13.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>We may update this policy from time to time. When we make important changes, we will update the date at the top and, where appropriate, let you know.</p>
      </Section>

      <ContactLine />
    </LegalPage>
  );
}
