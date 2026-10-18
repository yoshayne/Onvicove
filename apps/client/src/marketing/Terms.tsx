import { Bullets, ContactLine, LegalPage, Section } from './legal';

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms govern your use of Shop Suite Direct ("we", "us", "the platform"). By creating an account or using the platform, you agree to them. If you do not agree, please do not use the platform.</p>

      <Section title="What we provide">
        <p>Shop Suite Direct lets you build a website, list products and services, take bookings, accept payments and manage customers. Some features are free and some require a paid plan. We may add, change or remove features over time.</p>
      </Section>

      <Section title="Your account">
        <Bullets items={[
          'You must be at least 18 and able to enter a binding agreement, and you must give accurate information.',
          'You are responsible for your account, for keeping your sign-in secure, and for everything done through it.',
          'Tell us promptly if you think someone has accessed your account without permission.',
        ]} />
      </Section>

      <Section title="Your store and your content">
        <p>You own what you upload and publish, including text, photos, logos and your product and service listings. You give us permission to host, display, process and back it up so we can run your store, and to use it to produce things you ask for, such as flyers.</p>
        <p>You are responsible for your content and for your business: your prices, services, orders, bookings, refunds, taxes, licenses and how you treat your customers. You confirm you have the rights to everything you upload.</p>
      </Section>

      <Section title="Acceptable use">
        <p>You may not use the platform to:</p>
        <Bullets items={[
          'sell or promote anything illegal, or items and services that Stripe or the law prohibit;',
          'deceive customers, infringe someone else\'s rights, or upload harmful or unlawful content;',
          'attack, overload, probe or try to break the platform, or access other people\'s accounts or data;',
          'send spam or misuse customer information.',
        ]} />
        <p>We may remove content or suspend or close accounts that break these rules or put others at risk.</p>
      </Section>

      <Section title="Payments">
        <p>Payments from your customers are processed by Stripe. To accept payments you must connect a Stripe account and agree to Stripe's own terms. We are not a bank and do not hold your funds.</p>
        <Bullets items={[
          'Fees: Stripe charges its card processing fee on each payment. We also charge a platform fee, shown on our pricing page and in your dashboard, which may differ by plan. Fees may change with notice.',
          'Refunds and disputes: you are responsible for refunds, chargebacks and disputes on your sales. Stripe\'s processing fee is not returned on a refund.',
          'You are responsible for collecting and paying any taxes that apply to your sales.',
        ]} />
      </Section>

      <Section title="Plans and billing">
        <p>Paid plans (Pro, Business) are billed monthly through Stripe until you cancel. You can cancel anytime in your dashboard; cancellation takes effect at the end of the period you have already paid for, and your site stays live on the free plan. Pro-only features, such as premium themes, apply only while you are on a paid plan. Prices may change with advance notice.</p>
      </Section>

      <Section title="AI features">
        <p>Some features use AI to generate or suggest things, such as enhanced photos, flyers or calendar changes. AI output can be wrong or unexpected. Please review it before you rely on or publish it. Calendar changes proposed by the assistant are applied only after you confirm them.</p>
      </Section>

      <Section title="Availability and changes">
        <p>We work to keep the platform available but do not promise it will be uninterrupted or error-free. We may update these terms; if the changes are important we will let you know, and continuing to use the platform means you accept them.</p>
      </Section>

      <Section title="Ending your account">
        <p>You may stop using the platform and close your account at any time. We may suspend or end an account that breaks these terms, is unpaid, or creates risk. When an account ends, your access ends and your store may be taken offline. See our Privacy Policy for how we handle your information.</p>
      </Section>

      <Section title="Disclaimers and limits on liability">
        <p>The platform is provided "as is" and "as available", without warranties of any kind to the extent the law allows. To the extent the law allows, we are not liable for indirect, incidental or consequential damages, lost profits or lost data, and our total liability for any claim is limited to the amount you paid us for the platform in the 12 months before the claim. Some places do not allow these limits, so they may not apply to you.</p>
      </Section>

      <Section title="General">
        <p>If any part of these terms cannot be enforced, the rest still applies. These terms, together with our Privacy Policy, are the whole agreement between you and us about the platform.</p>
      </Section>

      <ContactLine />
    </LegalPage>
  );
}
