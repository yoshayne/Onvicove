import { useState, useEffect } from 'react';

interface PriceInputProps {
  priceCents: number;
  onChange: (priceCents: number) => void;
  placeholder?: string;
  className?: string;
}

// Lets the user type freely (e.g. "12", "12.", "12.5") without reformatting
// on every keystroke, then normalizes to dollars-and-cents on blur.
export default function PriceInput({ priceCents, onChange, placeholder, className }: PriceInputProps) {
  const [text, setText] = useState(priceCents ? (priceCents / 100).toFixed(2) : '');

  useEffect(() => {
    setText(priceCents ? (priceCents / 100).toFixed(2) : '');
  }, [priceCents]);

  function handleChange(value: string) {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;
    setText(value);
    const parsed = parseFloat(value);
    onChange(Number.isFinite(parsed) ? Math.round(parsed * 100) : 0);
  }

  function handleBlur() {
    setText(priceCents ? (priceCents / 100).toFixed(2) : '');
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder ?? '0.00'}
      className={className}
    />
  );
}
