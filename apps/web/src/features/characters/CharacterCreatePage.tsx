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
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { useActiveCharacter } from './active-character';
import { useCreateCharacter } from './api';
import { AttributePicker } from './AttributePicker';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { weaponArtFor } from '../avatar/weapon-art';
import { AppearanceEditor } from './AppearanceEditor';

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
    <Screen>
      <header className="topbar">
        <Link className="btn btn-ghost btn-sm" to="/characters">
          <Icon name="back" />
          Back
        </Link>
        <h1>Create a character</h1>
        <span className="spacer" />
        <span className="logo">The Living Realms</span>
      </header>
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <div className="create-layout">
          <div className="create-col left">
            <FormError error={create.error} />
            <section className="panel">
              <Field
                label="Name"
                value={name}
                maxLength={CHARACTER_NAME_MAX + 10}
                autoComplete="off"
                error={errors.name}
                hint={`${CHARACTER_NAME_MIN}–${CHARACTER_NAME_MAX} letters. Spaces, apostrophes and hyphens allowed. Must be unique.`}
                onChange={(e) => setName(e.target.value)}
              />
            </section>
            <section className="panel">
              <AttributePicker value={attributes} onChange={setAttributes} />
              {errors.attributes && <p className="field-error">{errors.attributes}</p>}
            </section>
          </div>

          <aside className="preview" aria-label="Preview">
            <div className="pedestal">
              <CharacterAvatar
                appearance={appearance}
                weapon={weaponArtFor(weapon)}
                size={320}
                title="Preview"
              />
            </div>
            <span className="hero-name">{name.trim() || 'Unnamed'}</span>
            <span className="gold">{getItemDef(weapon)?.name}</span>
            <dl className="stat-list">
              <div>
                <dt>HP</dt>
                <dd>{preview.maxHp}</dd>
              </div>
              <div>
                <dt>Mana</dt>
                <dd>{preview.maxMana}</dd>
              </div>
              <div>
                <dt>Initiative</dt>
                <dd>{preview.initiative}</dd>
              </div>
              <div>
                <dt>Dodge</dt>
                <dd>{preview.dodgeChance}%</dd>
              </div>
              <div>
                <dt>Crit</dt>
                <dd>{preview.critChance}%</dd>
              </div>
            </dl>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Stats shown without equipment. Placeholder art.
            </span>
          </aside>

          <div className="create-col right">
            <section className="panel">
              <fieldset className="field">
                <legend className="legend">
                  Starting weapon — your weapon defines how you fight
                </legend>
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
            </section>
            <section className="panel">
              <div className="panel-title">
                <span>Appearance</span>
              </div>
              <AppearanceEditor value={appearance} onChange={setAppearance} />
            </section>
          </div>
        </div>
        <footer className="create-footer">
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Choose a name, spend your points and pick a weapon.
          </span>
          <span className="spacer" />
          <button className="btn btn-primary btn-lg" type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create and enter the world'}
          </button>
        </footer>
      </form>
    </Screen>
  );
}
