export interface RefundTemplateInput {
  company: string;
  sells: boolean;
  books: boolean;
  /** Hours before an appointment that a customer can still cancel or move it (Settings > Cancellation window) */
  cancelHours: number;
}

/**
 * Starter wording for a store's refund policy. It is a plain-language starting point, not legal advice: the owner
 * edits it to match what they really do.
 */
export function refundTemplate({ company, sells, books, cancelHours }: RefundTemplateInput): string {
  const parts: string[] = [];
  if (sells) {
    parts.push(
      `Products\n` +
      `If something is wrong with your order, contact ${company} within 14 days of receiving it and we will make it right with a replacement, a refund or store credit.\n` +
      `Items can be returned within 14 days if they are unused and in their original condition. Return shipping is paid by the customer unless the item was damaged or sent in error.\n` +
      `Made-to-order and custom items can't be returned unless there is a fault.\n` +
      `Approved refunds go back to the original payment method.`,
    );
  }
  if (books) {
    parts.push(
      `Appointments and deposits\n` +
      `You can cancel or reschedule up to ${cancelHours} hours before your appointment from the link in your confirmation email.\n` +
      `If you cancel inside that window, or don't show up, your deposit is not refunded and the appointment may be charged in full.\n` +
      `If ${company} has to cancel, you will get a full refund or a new time of your choice.`,
    );
  }
  parts.push(
    `Monthly plans\n` +
    `You can cancel a monthly plan at any time. Cancelling stops future payments, and you keep your plan until the end of the period you have already paid for. Payments already made are not refunded, except where we decide to make an exception or the law requires it.`,
  );
  parts.push(`Questions\nContact ${company} using the details on our website and we will help.`);
  return parts.join('\n\n');
}
