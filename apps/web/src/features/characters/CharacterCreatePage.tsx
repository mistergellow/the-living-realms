import {
  BASE_ATTRIBUTES,
  CHARACTER_NAME_MAX,
  CHARACTER_NAME_MIN,
  computeStats,
  describeTargeting,
  getAbility,
  getItemDef,
  STARTER_WEAPONS,
  validateCharacterName,
  validatePointBuy,
} from '@realms/game-core';
import { DEFAULT_APPEARANCE, type AppearanceV2, type Attributes } from '@realms/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { fieldErrors } from '../../lib/api';
import { Field } from '../../shared/ui/Field';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from './active-character';
import { useCreateCharacter } from './api';
import { AttributePicker } from './AttributePicker';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { weaponArtFor } from '../avatar/weapon-art';
import { AppearanceEditor } from './AppearanceEditor';

const legend = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
} as const;

export function CharacterCreatePage() {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [appearance, setAppearance] = useState<AppearanceV2>(DEFAULT_APPEARANCE);
  const [attributes, setAttributes] = useState<Attributes>(BASE_ATTRIBUTES);
  const [weapon, setWeapon] = useState<string>(STARTER_WEAPONS[0]!);
  const create = useCreateCharacter();
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();

  // Live preview using the same rules as the server.
  const preview = computeStats(attributes).stats;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = validateCharacterName(name);
    const pb = validatePointBuy(attributes);
    const next = { name: v.ok ? undefined : v.reason, attributes: pb.ok ? undefined : pb.reason };
    setErrors(next);
    if (!v.ok || !pb.ok) return;
    create.mutate(
      { name: v.name, appearance, attributes, startingWeapon: weapon },
      {
        onSuccess: (c) => {
          select(c.id);
          navigate('/world');
        },
        onError: (err) => setErrors(fieldErrors(err)),
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
            error={errors.name}
            hint={`${CHARACTER_NAME_MIN}–${CHARACTER_NAME_MAX} letters. Spaces, apostrophes and hyphens allowed. Must be unique.`}
            onChange={(e) => setName(e.target.value)}
          />

          <section className="panel">
            <AttributePicker value={attributes} onChange={setAttributes} />
            {errors.attributes && <p className="field-error">{errors.attributes}</p>}
          </section>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={legend}>Starting weapon — your weapon defines how you fight</legend>
            <div className="weapon-grid">
              {STARTER_WEAPONS.map((id) => {
                const def = getItemDef(id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    className="weapon-card"
                    aria-pressed={weapon === id}
                    onClick={() => setWeapon(id)}
                  >
                    <strong>{def.name}</strong>
                    <span className="field-hint">{def.description}</span>
                    <ul className="ability-mini">
                      {def.abilities?.map((aid) => {
                        const a = getAbility(aid)!;
                        return (
                          <li key={aid}>
                            {a.name}{' '}
                            <span className="muted">
                              · {a.focusCost} Focus{a.manaCost ? ` + ${a.manaCost} Mana` : ''} ·{' '}
                              {describeTargeting(a.targeting)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <section className="panel">
            <div className="panel-title">Appearance</div>
            <AppearanceEditor value={appearance} onChange={setAppearance} />
          </section>
          <div>
            <button className="btn btn-primary" type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create and enter the world'}
            </button>
          </div>
        </div>
        <aside className="panel preview" aria-label="Preview">
          <CharacterAvatar
            appearance={appearance}
            weapon={weaponArtFor(weapon)}
            size={190}
            title="Preview"
          />
          <strong>{name.trim() || 'Unnamed'}</strong>
          <span className="muted">{getItemDef(weapon)?.name}</span>
          <dl className="stat-list">
            <dt>HP</dt>
            <dd>{preview.maxHp}</dd>
            <dt>Mana</dt>
            <dd>{preview.maxMana}</dd>
            <dt>Initiative</dt>
            <dd>{preview.initiative}</dd>
            <dt>Dodge</dt>
            <dd>{preview.dodgeChance}%</dd>
            <dt>Crit</dt>
            <dd>{preview.critChance}%</dd>
          </dl>
          <span className="muted" style={{ fontSize: 12 }}>
            Stats shown without equipment. Placeholder art.
          </span>
        </aside>
      </form>
    </main>
  );
}
