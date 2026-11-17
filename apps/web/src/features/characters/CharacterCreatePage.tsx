import { CHARACTER_NAME_MAX, CHARACTER_NAME_MIN, validateCharacterName } from '@realms/game-core';
import { APPEARANCE_COLORS, APPEARANCE_EMBLEMS, type CharacterAppearance } from '@realms/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { fieldErrors } from '../../lib/api';
import { Field } from '../../shared/ui/Field';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from './active-character';
import { useCreateCharacter } from './api';
import { CharacterToken } from './CharacterToken';

export function CharacterCreatePage() {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [appearance, setAppearance] = useState<CharacterAppearance>({
    version: 1,
    color: APPEARANCE_COLORS[5],
    emblem: APPEARANCE_EMBLEMS[0],
  });
  const create = useCreateCharacter();
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Shared rules from @realms/game-core give instant feedback; the server is authoritative.
    const v = validateCharacterName(name);
    if (!v.ok) return setNameError(v.reason);
    setNameError(undefined);
    create.mutate(
      { name: v.name, appearance },
      {
        onSuccess: (c) => {
          select(c.id);
          navigate('/world');
        },
        onError: (err) => setNameError(fieldErrors(err).name),
      },
    );
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>Create a character</h1>
        <span className="spacer" />
        <Link className="btn btn-ghost btn-sm" to="/characters">
          Back
        </Link>
      </header>
      <form className="create-layout" onSubmit={onSubmit} noValidate>
        <div className="stack">
          <FormError error={create.error} />
          <Field
            label="Name"
            value={name}
            maxLength={CHARACTER_NAME_MAX + 10}
            autoComplete="off"
            error={nameError}
            hint={`${CHARACTER_NAME_MIN}–${CHARACTER_NAME_MAX} letters. Spaces, apostrophes and hyphens allowed. Must be unique.`}
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend
              className="field-label"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}
            >
              Color
            </legend>
            <div className="swatches">
              {APPEARANCE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="swatch"
                  aria-label={`Color ${color}`}
                  aria-pressed={appearance.color === color}
                  style={{ background: color }}
                  onClick={() => setAppearance((a) => ({ ...a, color }))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}
            >
              Emblem
            </legend>
            <div className="swatches">
              {APPEARANCE_EMBLEMS.map((emblem) => (
                <button
                  key={emblem}
                  type="button"
                  className="swatch"
                  aria-label={`Emblem ${emblem}`}
                  aria-pressed={appearance.emblem === emblem}
                  onClick={() => setAppearance((a) => ({ ...a, emblem }))}
                >
                  <CharacterToken appearance={{ ...appearance, emblem }} size={30} />
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <button className="btn btn-primary" type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create and enter the world'}
            </button>
          </div>
        </div>
        <aside className="panel preview" aria-label="Preview">
          <CharacterToken appearance={appearance} size={120} />
          <strong>{name.trim() || 'Unnamed'}</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            Appearance is a placeholder for this phase.
          </span>
        </aside>
      </form>
    </main>
  );
}
