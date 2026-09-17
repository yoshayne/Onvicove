import { useState, useEffect, useRef } from 'react';

const PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#0ea5e9', '#64748b', '#000000',
];

/** Convert any CSS color string (name or hex) to a #rrggbb hex string.
 *  Returns null if the value isn't a valid colour. */
function toHex(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const el = document.createElement('canvas').getContext('2d');
  if (!el) return null;
  el.fillStyle = '#000';
  el.fillStyle = trimmed;
  const resolved = el.fillStyle as string;
  // Canvas resolves invalid values back to '#000000', so check if the original was black
  if (resolved === '#000000' && !/^(#0{3,6}|black|rgb\(0,0,0\))$/i.test(trimmed)) return null;
  return resolved;
}

interface Props {
  value: string;            // current hex colour, e.g. "#6366f1"
  onChange: (hex: string) => void;
  presets?: string[];       // override default preset swatches
  label?: string;
  className?: string;
}

export default function ColorPicker({ value, onChange, presets = PRESETS, label, className = '' }: Props) {
  // The text field can hold a partial/in-progress value; commit only when valid
  const [textValue, setTextValue] = useState(value || '');
  const [textError, setTextError] = useState(false);
  const wheelRef = useRef<HTMLInputElement>(null);

  // Keep textValue in sync when parent changes value (e.g. reset)
  useEffect(() => {
    setTextValue(value || '');
    setTextError(false);
  }, [value]);

  function applyColor(hex: string) {
    setTextValue(hex);
    setTextError(false);
    onChange(hex);
  }

  function handlePreset(hex: string) {
    applyColor(hex);
  }

  function handleWheel(e: React.ChangeEvent<HTMLInputElement>) {
    applyColor(e.target.value);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setTextValue(raw);
    const hex = toHex(raw);
    if (hex) {
      setTextError(false);
      onChange(hex);
    } else {
      setTextError(!!raw); // only mark error if non-empty
    }
  }

  function handleTextBlur() {
    // On blur: if the text resolves to a colour, normalise to hex; otherwise revert
    const hex = toHex(textValue);
    if (hex) {
      setTextValue(hex);
      setTextError(false);
      onChange(hex);
    } else if (textValue) {
      // Revert to last valid value
      setTextValue(value || '');
      setTextError(false);
    }
  }

  const displayColor = value || '#000000';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      )}

      {/* Preset swatches */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((c) => {
          const isActive = value?.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => handlePreset(c)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
              style={{
                backgroundColor: c,
                borderColor: isActive ? '#6366f1' : 'transparent',
                boxShadow: isActive
                  ? '0 0 0 2px white, 0 0 0 4px #6366f1'
                  : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
              }}
              title={c}
            />
          );
        })}
      </div>

      {/* Wheel + text input row */}
      <div className="flex items-center gap-2">
        {/* Colour preview swatch — clicking it opens the native wheel */}
        <button
          type="button"
          onClick={() => wheelRef.current?.click()}
          className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-violet-400"
          style={{ backgroundColor: displayColor }}
          title="Open colour picker"
        />

        {/* Hidden native colour wheel */}
        <input
          ref={wheelRef}
          type="color"
          value={displayColor}
          onChange={handleWheel}
          className="sr-only"
          tabIndex={-1}
        />

        {/* Editable hex/name field */}
        <input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="#000000 or colour name"
          spellCheck={false}
          className={`flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${
            textError
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        />
      </div>

      {textError && (
        <p className="text-[11px] text-red-500">Not a recognised colour — try a hex code like #3b82f6</p>
      )}
    </div>
  );
}
