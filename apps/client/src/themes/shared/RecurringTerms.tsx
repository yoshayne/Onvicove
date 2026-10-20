/** The recurring-billing authorization the customer agrees to (the store's legal name is filled in) */
export default function RecurringTerms({ legalName }: { legalName: string }) {
  const m = legalName;
  return (
    <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-600">
      <h4 className="text-sm font-semibold text-gray-800">Recurring Payments and Automatic Billing Authorization</h4>

      <p><strong>1. Authorization to Charge.</strong> When you enroll in a recurring payment, subscription, membership, installment plan, or other automatically billed service offered by <strong>{m}</strong> (“Merchant,” “we,” “us,” or “our”), you authorize {m} and its authorized payment processor to charge your selected payment method according to the payment terms presented to you at checkout. Your authorization applies only to the products or services you select and the recurring payment terms you expressly accept.</p>

      <p><strong>2. Billing Amount and Frequency.</strong> Before completing your purchase, you will be shown the applicable price, billing frequency, and other material payment terms. Depending on your purchase, charges may occur weekly, monthly, annually, or according to another schedule disclosed at checkout. Applicable taxes, shipping charges, service fees, or other additional amounts will be disclosed before you authorize payment, where applicable. If the amount or billing terms change, we will provide any notice and obtain any consent required by applicable law before charging you under the revised terms.</p>

      <p><strong>3. Automatic Renewal.</strong> Unless otherwise disclosed at checkout, recurring payments will continue automatically at the agreed billing interval until you cancel or the recurring arrangement otherwise ends. By accepting the recurring payment terms, you acknowledge that your payment method will be charged automatically without requiring you to approve each individual payment. Any introductory offer, free trial, promotional rate, or subsequent price change will be subject to the terms disclosed when you enroll and any additional notice or consent required by law.</p>

      <p><strong>4. Cancellation.</strong> You may cancel your recurring payment arrangement using the cancellation method provided by {m}. Where available, cancellation may be completed through your customer account or by contacting the Merchant through its published contact information. Cancellation will stop future recurring charges in accordance with the disclosed cancellation terms and applicable law. Unless otherwise required by law or expressly stated in the applicable offer, cancellation does not automatically reverse payments already processed, waive outstanding amounts properly due, or entitle you to a refund for a prior billing period. Any applicable cancellation deadline, minimum commitment, or notice period must be disclosed before enrollment.</p>

      <p><strong>5. Failed Payments.</strong> If a payment cannot be processed, {m} may notify you and request updated payment information. Any additional payment attempts, late fees, or other charges will be subject to the terms disclosed to you and applicable law.</p>

      <p><strong>6. Refunds and Disputes.</strong> Refunds, credits, and disputes are handled in accordance with the Merchant’s published refund policy and applicable law. Nothing in these terms limits any rights you may have under applicable consumer protection laws or payment network rules.</p>

      <p><strong>7. Payment Processing.</strong> Payments may be processed by a third-party payment service provider on behalf of {m}. Your payment information will be handled in accordance with the applicable payment processor’s terms and privacy practices, as well as the Merchant’s privacy policy.</p>

      <p><strong>8. Withdrawal of Authorization.</strong> You may withdraw your authorization for future recurring charges by canceling the recurring arrangement using the available cancellation method. Contacting your bank or payment provider to block a payment does not necessarily cancel the underlying purchase, subscription, or contractual obligation.</p>

      <p><strong>9. Confirmation of Authorization.</strong> By affirmatively selecting the recurring payment authorization at checkout and completing your purchase, you acknowledge that you have reviewed the recurring payment terms and authorize {m} to initiate recurring charges as described in your order and these terms.</p>
    </div>
  );
}
