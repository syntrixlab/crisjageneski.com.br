import { useRef } from 'react';

const BRAND_SWATCHES: Array<{ hex: string; label: string }> = [
  { hex: '#1f2d16', label: 'Deep' },
  { hex: '#545e45', label: 'Forest' },
  { hex: '#76704c', label: 'Olive' },
  { hex: '#8d2b00', label: 'Terracota' },
  { hex: '#b55119', label: 'Terracota forte' },
  { hex: '#be6731', label: 'Clay' },
  { hex: '#f9f4ec', label: 'Paper' },
  { hex: '#f3ede4', label: 'Shell' },
  { hex: '#fffaf4', label: 'Surface' },
  { hex: '#ffffff', label: 'Branco' }
];

export function ColorSwatchPicker(_props: {
  value?: string;
  onChange: (color: string | undefined) => void;
}) {
  const { value, onChange } = _props;
  const customRef = useRef<HTMLInputElement>(null);

  const normalised = value?.toLowerCase();
  const isBrandColor = BRAND_SWATCHES.some((s) => s.hex === normalised);
  const isCustom = !!value && !isBrandColor;

  return (
    <div className="color-swatch-picker">
      <div className="color-swatches">
        {BRAND_SWATCHES.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            className={`color-swatch${normalised === swatch.hex ? ' is-active' : ''}`}
            style={{ background: swatch.hex }}
            title={swatch.label}
            aria-label={swatch.label}
            aria-pressed={normalised === swatch.hex}
            onClick={() => onChange(normalised === swatch.hex ? undefined : swatch.hex)}
          />
        ))}

        <button
          type="button"
          className={`color-swatch color-swatch--custom${isCustom ? ' is-active' : ''}`}
          title="Cor personalizada"
          aria-label="Cor personalizada"
          style={isCustom ? { background: value } : undefined}
          onClick={() => customRef.current?.click()}
        >
          {!isCustom && '+'}
        </button>
        <input
          ref={customRef}
          type="color"
          className="color-swatch-input"
          value={value && value !== '' ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden
        />
      </div>

      {value && (
        <button
          type="button"
          className="color-swatch-clear"
          onClick={() => onChange(undefined)}
        >
          Remover cor
        </button>
      )}
    </div>
  );
}
