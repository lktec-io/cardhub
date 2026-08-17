import { ColorField, Select, Input } from '../../../../components/ui';
import { FONT_OPTIONS } from '../../../../constants/fonts';

const BACKGROUND_OPTIONS = [
  { value: 'template', label: 'Template default' },
  { value: 'solid', label: 'Solid color' },
  { value: 'image', label: 'Image' },
];

export function BuilderDesignPanel({ design, templateColors, onChange }) {
  const colors = design.colors || templateColors || { primary: '#0d2235', accent: '#22c55e' };
  const usingCustomColors = Boolean(design.colors);

  function updateColors(patch) {
    onChange({ colors: { ...colors, ...patch } });
  }

  function updateBackground(patch) {
    onChange({ background: { ...design.background, ...patch } });
  }

  return (
    <div className="ch-builder-design">
      <div className="ch-builder-design__section">
        <div className="ch-builder-design__heading">
          <p className="ch-field__label">Colors</p>
          {usingCustomColors && (
            <button type="button" className="ch-auth-form__link" onClick={() => onChange({ colors: null })}>
              Reset to template
            </button>
          )}
        </div>
        <div className="ch-event-form__row">
          <ColorField label="Primary" value={colors.primary} onChange={(primary) => updateColors({ primary })} />
          <ColorField label="Accent" value={colors.accent} onChange={(accent) => updateColors({ accent })} />
        </div>
      </div>

      <Select
        label="Typography"
        value={design.font}
        onChange={(e) => onChange({ font: e.target.value })}
        options={FONT_OPTIONS}
      />

      <div className="ch-builder-design__section">
        <Select
          label="Background"
          value={design.background?.type || 'template'}
          onChange={(e) => updateBackground({ type: e.target.value, value: null })}
          options={BACKGROUND_OPTIONS}
        />
        {design.background?.type === 'solid' && (
          <ColorField label="Background color" value={design.background.value || '#0d2235'} onChange={(value) => updateBackground({ value })} />
        )}
        {design.background?.type === 'image' && (
          <Input
            label="Background image URL"
            value={design.background.value || ''}
            onChange={(e) => updateBackground({ value: e.target.value })}
            placeholder="https://example.com/background.jpg"
          />
        )}
      </div>

      <Input
        label="Cover image URL (optional)"
        value={design.coverImage || ''}
        onChange={(e) => onChange({ coverImage: e.target.value || null })}
        placeholder="https://example.com/cover.jpg"
        hint="Shown behind your hero section. Paste a direct link to an image."
      />
    </div>
  );
}
