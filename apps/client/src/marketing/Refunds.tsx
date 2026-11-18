import { Link } from 'react-router-dom';
import { Bullets, ContactLine, LegalPage, Section } from './legal';

export default function Refunds() {
  return (
    <LegalPage title="Refund Policy">
      <p>This page explains how refunds work on Shop Suite Direct. There are two different kinds of payment, and they follow different rules: what customers pay a store, and what a store pays us.</p>

      <Section title="If you bought from a store">
        <p>Every store on Shop Suite Direct is run by an independent business. When you pay a store for a product, a booking, a deposit or a monthly plan, your payment goes to that store, and the store is the seller. We are not the seller and we do not hold your money.</p>
        <Bullets items={[
          'Each store sets its own refund, return and cancellation rules. Look for the "Refund policy" link at the bottom of the store\'s website, or in your booking or plan confirmation.',
          'Contact the store first. Refunds, exchanges and credits are the store\'s decision, under its own policy and the law that applies to it.',
          'Your rights under consumer protection law and card network rules are not affected by anything on this page.',
          'If a store has not responded and you believe you were charged in error, you can also ask your card issuer about the charge. You can reach us through the help options in the account, but we cannot refund a payment that went to a store.',
        ]} />
      </Section>

      <Section title="If you run a store">
        <p>You are responsible for refunds on your own sales, and we recommend you publish a refund policy for your customers. In your dashboard, go to Settings and use the Refund policy box. It appears as a link on your site and is the policy shown in the monthly-plan terms your customers agree to.</p>
        <Bullets items={[
          'When you refund a payment, the platform fee we charged on it is refunded with it. Stripe\'s card processing fee is not returned by Stripe on a refund.',
          'Monthly plans: cancelling stops future charges. Whether to refund a payment already made, in full or in part, is up to you.',
          'Disputes and chargebacks on your sales are handled between you, your customer and Stripe.',
        ]} />
      </Section>

      <Section title="Our own fees (Pro and Business plans)">
        <Bullets items={[
          'Pro and Business are billed monthly through Stripe. You can cancel at any time in your dashboard. Cancelling takes effect at the end of the month you have already paid for, and your site stays live on the free plan.',
          'Subscription payments are not refunded for a month that has started, and we do not give partial-month refunds.',
          'If we charge you by mistake, charge you twice, or bill you after a cancellation took effect, tell us and we will correct it and refund the wrong charge.',
          'AI photo credits, domain registrations and other one-off purchases made through us are not refundable once the photo has been generated or the domain registered, except where the law requires otherwise or something went wrong on our side.',
        ]} />
        <p>Nothing here limits any right you have under the law where you live. See our <Link className="font-medium underline" to="/terms">Terms of Service</Link> for the full terms.</p>
      </Section>

      <ContactLine />
    </LegalPage>
  );
}
