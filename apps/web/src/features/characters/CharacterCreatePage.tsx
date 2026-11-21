import {
  ATTRIBUTE_RULES,
  BASE_ATTRIBUTES,
  CHARACTER_NAME_MAX,
  CHARACTER_NAME_MIN,
  computeStats,
  describeEffects,
  describeScaling,
  getAbility,
  getItemDef,
  ORIGINS,
  STARTER_OFFHANDS,
  STARTER_WEAPONS,
  validateCharacterName,
  validateCreationAttributes,
  type OwnedItem,
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
import { offhandArtFor, weaponArtFor } from '../avatar/weapon-art';
import { AppearanceEditor } from './AppearanceEditor';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';

export function CharacterCreatePage() {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [appearance, setAppearance] = useState<AppearanceV2>(DEFAULT_APPEARANCE);
  const [attributes, setAttributes] = useState<Attributes>(BASE_ATTRIBUTES);
  const [weapon, setWeapon] = useState<string>(STARTER_WEAPONS[0]!);
  const [offhand, setOffhand] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const twoHanded = !!getItemDef(weapon)?.twoHanded;
  const chosenOffhand = twoHanded ? null : offhand;
  const create = useCreateCharacter();
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();

  // Live preview using the same rules as the server (starter kit equipped).
  const kit: OwnedItem[] = [
    { id: 'w', defId: weapon, quality: 100, equippedSlot: 'mainHand' },
    { id: 't', defId: 'padded_tunic', quality: 100, equippedSlot: 'body' },
    ...(chosenOffhand
      ? [{ id: 'o', defId: chosenOffhand, quality: 100, equippedSlot: 'offHand' as const }]
      : []),
  ];
  const preview = computeStats(attributes, kit).stats;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = validateCharacterName(name);
    const pb = validateCreationAttributes(attributes);
    const next = {
      name: v.ok ? undefined : v.reason,
      attributes: pb.ok ? undefined : pb.reason,
      origin: origin ? undefined : 'Choose your country of origin.',
    };
    setErrors(next);
    if (!v.ok || !pb.ok || !origin) return;
    create.mutate(
      {
        name: v.name,
        appearance,
        attributes,
        startingWeapon: weapon,
        origin,
        ...(chosenOffhand ? { startingOffhand: chosenOffhand } : {}),
      },
      {
        onSuccess: (c) => {
          select(c.id);
          navigate('/home');
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
              <fieldset className="field">
                <legend className="legend">
                  Country of origin — sets your native language. Chosen only once.
                </legend>
                <div className="origin-grid" data-testid="origins">
                  {Object.values(ORIGINS).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="weapon-card"
                      aria-pressed={origin === o.id}
                      onClick={() => setOrigin(o.id)}
                    >
                      <strong>{o.name}</strong>
                      <span className="field-hint">{o.description}</span>
                      <span className="field-hint">Language: {o.language}</span>
                    </button>
                  ))}
                </div>
                {errors.origin && <p className="field-error">{errors.origin}</p>}
              </fieldset>
            </section>
            <section className="panel">
              <p className="field-hint" style={{ marginTop: 0 }}>
                Base attributes are chosen only now and never change. Equipment adds on top; some
                skill books need a minimum base score.
              </p>
              <AttributePicker
                value={attributes}
                onChange={setAttributes}
                floor={BASE_ATTRIBUTES}
                points={ATTRIBUTE_RULES.creationPoints}
              />
              {errors.attributes && <p className="field-error">{errors.attributes}</p>}
            </section>
          </div>

          <aside className="preview" aria-label="Preview">
            <div className="pedestal">
              <CharacterAvatar
                appearance={appearance}
                weapon={weaponArtFor(weapon)}
                offhand={offhandArtFor(chosenOffhand)}
                size={320}
                title="Preview"
              />
            </div>
            <span className="hero-name">{name.trim() || 'Unnamed'}</span>
            <span className="gold">
              {getItemDef(weapon)?.name}
              {chosenOffhand ? ` + ${getItemDef(chosenOffhand)?.name}` : ''}
            </span>
            <dl className="stat-list">
              <div>
                <dt>HP</dt>
                <dd data-testid="preview-hp">{preview.maxHp}</dd>
              </div>
              <div>
                <dt>Mana</dt>
                <dd>{preview.maxMana}</dd>
              </div>
              <div>
                <dt>Armor</dt>
                <dd>−{preview.physicalReduction}%</dd>
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
                <dd>
                  {preview.critChance}% ×{preview.critDamage}%
                </dd>
              </div>
            </dl>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Includes your starter kit. Placeholder art.
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
                        <span className="field-hint">
                          Scales with {describeScaling(getAbility(def.abilities![0]!)!.scaling)}
                        </span>
                        <ul className="ability-mini">
                          {def.abilities?.map((aid) => {
                            const a = getAbility(aid)!;
                            return (
                              <li key={aid}>
                                {a.name}{' '}
                                <span className="muted">
                                  · {a.focusCost} Focus{a.manaCost ? ` + ${a.manaCost} Mana` : ''} ·{' '}
                                  {describeEffects(a).join(', ')}
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
              <fieldset className="field">
                <legend className="legend">
                  Off-hand {twoHanded ? '— not available with a two-handed weapon' : '(optional)'}
                </legend>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    data-active={!chosenOffhand}
                    aria-pressed={!chosenOffhand}
                    disabled={twoHanded}
                    onClick={() => setOffhand(null)}
                  >
                    None
                  </button>
                  {STARTER_OFFHANDS.map((id) => {
                    const def = getItemDef(id)!;
                    return (
                      <button
                        key={id}
                        type="button"
                        className="btn btn-sm"
                        data-active={chosenOffhand === id}
                        aria-pressed={chosenOffhand === id}
                        disabled={twoHanded}
                        title={def.description}
                        onClick={() => setOffhand(id)}
                      >
                        {def.name}
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
            Choose a name and origin, spend all your points and pick a weapon.
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
