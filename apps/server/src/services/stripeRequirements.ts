import type Stripe from 'stripe';

export interface RequirementItem {
  label: string;
  overdue: boolean;
}

export type StripeSetupStatus = 'ready' | 'needs_info' | 'verifying' | 'under_review';

export interface AccountSummary {
  status: StripeSetupStatus;
  ready: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  items: RequirementItem[];
  deadline: string | null;
  message: string;
}

/** Stripe's field names -> what a first-time store owner would call it. First matching rule wins. */
const RULES: [RegExp, string][] = [
  [/^external_account$/, 'Your bank account (where your money is paid out)'],
  [/\.(dob)(\.|$)/, 'Your date of birth'],
  [/\.ssn_last_4$/, 'The last 4 digits of your Social Security number'],
  [/\.id_number$/, 'Your full Social Security number (Stripe asks when the last 4 digits can\'t be matched)'],
  [/^company\.tax_id/, 'Your business EIN (the tax ID from the IRS)'],
  [/^company\.address/, 'Your business address'],
  [/(individual|representative|person_[^.]+)\.address/, 'Your home address'],
  [/verification\.(additional_)?document/, 'A photo of your government ID'],
  [/\.verification\./, 'A photo of your government ID'],
  [/^business_profile\.(url|product_description)/, 'Your website, or a short description of what you sell'],
  [/^business_profile\.mcc/, 'What kind of business you run'],
  [/^business_profile\.(name)|^company\.name/, 'Your business name'],
  [/\.phone$/, 'A phone number'],
  [/\.email$/, 'Your email address'],
  [/\.(first_name|last_name|first_name_kana|last_name_kana)$/, 'Your legal name'],
  [/^tos_acceptance/, 'Accept Stripe\'s terms of service'],
  [/(owners|directors|executives)_provided|relationship\./, 'Confirm who owns and runs the business'],
  [/^business_type$/, 'How your business is set up (just you, or a company)'],
];

function labelFor(key: string): string {
  const hit = RULES.find(([re]) => re.test(key));
  if (hit) return hit[1];
  const last = key.split('.').pop() ?? key;
  const words = last.replace(/_/g, ' ');
  return `More details about your business (${words})`;
}

/** Turns a Stripe account into a plain-language "what's left" summary. */
export function summarizeAccount(account: Stripe.Account): AccountSummary {
  const req = account.requirements;
  const due = [...(req?.currently_due ?? []), ...(req?.past_due ?? [])];
  const overdue = new Set(req?.past_due ?? []);

  const byLabel = new Map<string, boolean>();
  for (const key of due) {
    const label = labelFor(key);
    byLabel.set(label, (byLabel.get(label) ?? false) || overdue.has(key));
  }
  const items = [...byLabel.entries()].map(([label, isOverdue]) => ({ label, overdue: isOverdue }));

  const ready = !!account.charges_enabled && !!account.details_submitted;
  const disabled = req?.disabled_reason ?? null;
  const deadline = req?.current_deadline ? new Date(req.current_deadline * 1000).toISOString() : null;

  let status: StripeSetupStatus = 'needs_info';
  let message = 'Stripe still needs a few details before you can get paid.';
  if (ready && items.length === 0) {
    status = 'ready';
    message = 'You\'re all set to get paid.';
  } else if (ready) {
    status = 'needs_info';
    message = 'Payments work, but Stripe needs a few more details soon to keep them working.';
  } else if (disabled && /^(rejected|under_review|listed)/.test(disabled)) {
    status = 'under_review';
    message = 'Stripe is reviewing your account. Check your email from Stripe, or contact us and we\'ll help.';
  } else if (items.length === 0 && account.details_submitted && (req?.pending_verification?.length ?? 0) > 0) {
    status = 'verifying';
    message = 'Stripe is checking your details. This usually takes a day or less. You don\'t need to do anything.';
  } else if (items.length === 0) {
    message = 'Finish your payment setup on Stripe to start getting paid.';
  } else if (disabled === 'requirements.past_due') {
    message = 'Payments are paused until these are done:';
  }

  return {
    status,
    ready,
    charges_enabled: !!account.charges_enabled,
    payouts_enabled: !!account.payouts_enabled,
    details_submitted: !!account.details_submitted,
    items,
    deadline,
    message,
  };
}
