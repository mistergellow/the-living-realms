import {
  APPEARANCE_COLORS,
  BODY_TYPES,
  EYE_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  type AppearanceV2,
} from '@realms/shared';
import { CharacterAvatar } from '../avatar/CharacterAvatar';

function ColorRow<T extends string>(props: {
  name: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="field">
      <legend className="legend">{props.name}</legend>
      <div className="swatches">
        {props.options.map((c) => (
          <button
            key={c}
            type="button"
            className="swatch swatch-sm"
            aria-label={`${props.name} ${c}`}
            aria-pressed={props.value === c}
            style={{ background: c }}
            onClick={() => props.onChange(c)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Edit the base body (decision D32). Equipment will be drawn on top later. */
export function AppearanceEditor({
  value,
  onChange,
}: {
  value: AppearanceV2;
  onChange: (a: AppearanceV2) => void;
}) {
  const set = <K extends keyof AppearanceV2>(k: K, v: AppearanceV2[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="stack" style={{ gap: '0.9rem' }}>
      <fieldset className="field">
        <legend className="legend">Hair style</legend>
        <div className="swatches">
          {HAIR_STYLES.map((h) => (
            <button
              key={h}
              type="button"
              className="swatch swatch-portrait"
              aria-label={`Hair style ${h}`}
              aria-pressed={value.hairStyle === h}
              onClick={() => set('hairStyle', h)}
            >
              <CharacterAvatar
                appearance={{ ...value, hairStyle: h }}
                portrait
                size={44}
                animated={false}
              />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="field">
        <legend className="legend">Body</legend>
        <div className="row" style={{ gap: '0.5rem' }}>
          {BODY_TYPES.map((b) => (
            <button
              key={b}
              type="button"
              className="btn btn-sm"
              aria-pressed={value.body === b}
              data-active={value.body === b}
              onClick={() => set('body', b)}
            >
              {b === 'sturdy' ? 'Sturdy' : 'Slender'}
            </button>
          ))}
        </div>
      </fieldset>
      <ColorRow
        name="Skin"
        options={SKIN_TONES}
        value={value.skin}
        onChange={(v) => set('skin', v)}
      />
      <ColorRow
        name="Hair color"
        options={HAIR_COLORS}
        value={value.hairColor}
        onChange={(v) => set('hairColor', v)}
      />
      <ColorRow
        name="Eyes"
        options={EYE_COLORS}
        value={value.eyeColor}
        onChange={(v) => set('eyeColor', v)}
      />
      <ColorRow
        name="Outfit"
        options={APPEARANCE_COLORS}
        value={value.outfit}
        onChange={(v) => set('outfit', v)}
      />
    </div>
  );
}
