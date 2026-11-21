import {
  ATTRIBUTE_RULES,
  BASE_ATTRIBUTES,
  CHARACTER_NAME_MAX,
  CHARACTER_NAME_MIN,
  computeStats,
  describeEffects,
  getAbility,
  getItemDef,
  REGIONS,
  STARTER_KITS,
  validateCharacterName,
  type OwnedItem,
} from '@realms/game-core';
import {
  DEFAULT_APPEARANCE,
  NATION_IDS,
  type AppearanceV2,
  type NationId,
  type StarterKitId,
} from '@realms/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { fieldErrors } from '../../lib/api';
import { Field } from '../../shared/ui/Field';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from './active-character';
import { useCreateCharacter } from './api';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { weaponArtFor } from '../avatar/weapon-art';
import { AppearanceEditor } from './AppearanceEditor';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { cssColor, REGION_COLORS } from '../world/region-colors';

/** What each kit fights with: the weapon's abilities plus any starting spell. */
function kitAbilities(kit: (typeof STARTER_KITS)[number]) {
  const ids = [...(getItemDef(kit.weapon)?.abilities ?? []), ...kit.skills];
  return ids.flatMap((id) => {
    const a = getAbility(id);
    return a ? [a] : [];
  });
}

/**
 * Character creation (request #43, shorter): name, nation of origin (you start
 * in its capital), a starting kit and the look. Attribute points are spent
 * later on the character sheet.
 */
export function CharacterCreatePage() {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [appearance, setAppearance] = useState<AppearanceV2>(DEFAULT_APPEARANCE);
  const [nation, setNation] = useState<NationId | null>(null);
  const [kitId, setKitId] = useState<StarterKitId>('sword');
  const kit = STARTER_KITS.find((k) => k.id === kitId)!;
  const create = useCreateCharacter();
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();

  const owned: OwnedItem[] = [
    { id: 'w', defId: kit.weapon, quality: 100, equippedSlot: 'mainHand' },
    { id: 't', defId: 'padded_tunic', quality: 100, equippedSlot: 'body' },
  ];
  const preview = computeStats(BASE_ATTRIBUTES, owned).stats;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = validateCharacterName(name);
    const next = {
      name: v.ok ? undefined : v.reason,
      nation: nation ? undefined : 'Choose the nation you come from.',
    };
    setErrors(next);
    if (!v.ok || !nation) return;
    create.mutate(
      { name: v.name, appearance, nation, starterKit: kitId },
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
                hint={`${CHARACTER_NAME_MIN}–${CHARACTER_NAME_MAX} letters. Must be unique.`}
                onChange={(e) => setName(e.target.value)}
              />
            </section>
            <section className="panel">
              <fieldset className="field">
                <legend className="legend">Nation of origin — you start in its capital</legend>
                <div className="choice-grid" data-testid="nations">
                  {NATION_IDS.map((id) => {
                    const r = REGIONS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        className="choice-card"
                        aria-pressed={nation === id}
                        onClick={() => setNation(id)}
                        style={{ ['--swatch' as string]: cssColor(REGION_COLORS[id]) }}
                      >
                        <strong>{r.name}</strong>
                        <span className="field-hint">Capital: {r.capital!.name}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.nation && <p className="field-error">{errors.nation}</p>}
              </fieldset>
            </section>
          </div>

          <aside className="preview" aria-label="Preview">
            <div className="pedestal">
              <CharacterAvatar
                appearance={appearance}
                weapon={weaponArtFor(kit.weapon)}
                offhand={null}
                size={320}
                title="Preview"
              />
            </div>
            <span className="hero-name">{name.trim() || 'Unnamed'}</span>
            <span className="gold">
              {getItemDef(kit.weapon)?.name}
              {kit.skills.length
                ? ` + ${kit.skills.map((id) => getAbility(id)?.name).join(', ')}`
                : ''}
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
                <dt>Initiative</dt>
                <dd>{preview.initiative}</dd>
              </div>
            </dl>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Placeholder art.
            </span>
          </aside>

          <div className="create-col right">
            <section className="panel">
              <fieldset className="field">
                <legend className="legend">Start with</legend>
                <div className="choice-grid" data-testid="starter-kits">
                  {STARTER_KITS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      className="choice-card"
                      aria-pressed={kitId === k.id}
                      onClick={() => setKitId(k.id)}
                    >
                      <strong>{k.name}</strong>
                      <span className="field-hint">
                        {kitAbilities(k)
                          .map((a) => `${a.name} (${describeEffects(a).join(', ')})`)
                          .join(' · ')}
                      </span>
                    </button>
                  ))}
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
            Your {ATTRIBUTE_RULES.creationPoints} attribute points are spent later, on your
            character sheet.
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
