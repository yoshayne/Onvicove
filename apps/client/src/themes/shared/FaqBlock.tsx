import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '../types';

const DEFAULT_FAQS: FaqItem[] = [
  { id: 'default-1', question: 'How do I place an order?', answer: 'Browse our products or services, add items to your cart, and check out securely online. You\'ll receive a confirmation email right away.' },
  { id: 'default-2', question: 'What is your return policy?', answer: 'We offer a hassle-free return policy within 30 days of purchase. Items must be in original condition. Contact us to get started.' },
  { id: 'default-3', question: 'How can I get in touch?', answer: 'You can reach us via the contact form on this page, by email, or by phone. We typically respond within one business day.' },
];

interface Props {
  faqs?: FaqItem[];
  heading?: string;
  className?: string;
  itemStyle?: React.CSSProperties;
  headingStyle?: React.CSSProperties;
  questionStyle?: React.CSSProperties;
  answerStyle?: React.CSSProperties;
}

export default function FaqBlock({
  faqs,
  heading = 'Frequently Asked Questions',
  className = '',
  itemStyle,
  headingStyle,
  questionStyle,
  answerStyle,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const items = (faqs && faqs.length > 0) ? faqs : DEFAULT_FAQS;

  return (
    <div className={className}>
      <h2 style={headingStyle} className="text-3xl font-bold mb-10 text-center">
        {heading}
      </h2>
      <div className="max-w-2xl mx-auto px-6 flex flex-col gap-3">
        {items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} style={itemStyle} className="rounded-xl overflow-hidden border">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span style={questionStyle} className="font-semibold text-sm">{item.question}</span>
                <ChevronDown
                  size={16}
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4">
                  <p style={answerStyle} className="text-sm leading-relaxed opacity-80">{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
