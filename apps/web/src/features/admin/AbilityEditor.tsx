import {
  ATTRIBUTE_NAMES,
  describeEffects,
  describeScaling,
  describeTargeting,
  STATUS_NAMES,
  toCustomAbilityDef,
} from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  COMBAT_COLUMNS,
  STATUS_IDS,
  type CombatColumn,
  type CustomAbilityDto,
  type CustomAbilityEffect,
  type CustomAbilityInput,
  type CustomContentDto,
  type StatusId,
} from '@realms/shared';
import { useState } from 'react';
import { FormError } from '../../shared/ui/FormError';
import { useSaveCustomAbility } from './api';
import { Num, Select, Text } from './fields';

/*
 * Admin → Abilities ("powers"): create or edit a custom ability. A 'skill' is
 * taught to a character (Characters tab); a 'weapon' ability is granted by
 * items (Items tab). Numbers scale with attributes like built-in abilities.
 */

const EMPTY: CustomAbilityInput = {
  name: '',
  description: '',
  source: 'skill',
  focusCost: 1,
  manaCost: 0,
  targeting: { side: 'enemy', reach: 'first', area: 'column' },
  effects: [{ kind: 'damage', damageType: 'physical', min: 5, max: 7 }],
  scaling: {},
};

const EFFECT_DEFAULTS: Record<CustomAbilityEffect['kind'], CustomAbilityEffect> = {
  damage: { kind: 'damage', damageType: 'physical', min: 5, max: 7 },
  heal: { kind: 'heal', min: 4, max: 6 },
  block: { kind: 'block', min: 4, max: 6 },
  status: { kind: 'status', status: 'bleed', turns: 2, value: 3 },
};

type ReachOption = 'first' | 'first2' | 'any' | CombatColumn;
const REACH_LABELS: Record<ReachOption, string> = {
  first: 'Nearest position',
  first2: 'Two nearest positions',
  any: 'Any position',
  front: 'Front position only',
  second: '2nd position only',
  third: '3rd position only',
  back: 'Back position only',
};
const reachOf = (r: CustomAbilityInput['targeting']['reach']): ReachOption =>
  Array.isArray(r) ? (r[0] ?? 'front') : r;

export function AbilityEditor({ custom }: { custom: CustomContentDto | undefined }) {
  const [editing, setEditing] = useState<CustomAbilityDto | null>(null);
  const [formKey, setFormKey] = useState(0);
  const list = custom?.abilities ?? [];
  const start = (a: CustomAbilityDto | null) => {
    setEditing(a);
    setFormKey((k) => k + 1);
  };
  return (
    <div className="adm-split">
      <aside className="panel adm-list">
        <button className="btn btn-primary btn-sm" onClick={() => start(null)}>
          New ability
        </button>
        <ul>
          {list.map((a) => (
            <li key={a.id}>
              <button
                className={`adm-pick${editing?.id === a.id ? ' is-active' : ''}`}
                onClick={() => start(a)}
              >
                <strong>{a.name}</strong>
                <span className="muted">{a.source}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="muted">No custom abilities yet.</li>}
        </ul>
      </aside>
      <section className="adm-detail">
        <AbilityForm key={formKey} initial={editing} onSaved={setEditing} />
      </section>
    </div>
  );
}

function AbilityForm(props: {
  initial: CustomAbilityDto | null;
  onSaved: (a: CustomAbilityDto) => void;
}) {
  const save = useSaveCustomAbility();
  const [v, setV] = useState<CustomAbilityInput>(props.initial ?? EMPTY);
  const [savedId, setSavedId] = useState<string | null>(props.initial?.id ?? null);
  const set = (patch: Partial<CustomAbilityInput>) => setV((old) => ({ ...old, ...patch }));
  const setTargeting = (patch: Partial<CustomAbilityInput['targeting']>) =>
    set({ targeting: { ...v.targeting, ...patch } });
  const setEffect = (i: number, e: CustomAbilityEffect) =>
    set({ effects: v.effects.map((old, j) => (j === i ? e : old)) });

  const preview = toCustomAbilityDef({ ...v, id: 'preview' });

  return (
    <div className="panel adm-card stack">
      <h3 className="panel-title">
        <span>{savedId ? 'Edit ability' : 'New ability'}</span>
      </h3>
      {savedId && <p className="muted mono adm-note">id: {savedId}</p>}
      <div className="adm-grid">
        <Text label="Name" value={v.name} maxLength={48} onChange={(name) => set({ name })} />
        <Text
          label="Description"
          value={v.description}
          maxLength={240}
          multiline
          onChange={(description) => set({ description })}
        />
        <Select label="Type" value={v.source} onChange={(source) => set({ source })}>
          <option value="skill">Skill (taught to a character)</option>
          <option value="weapon">Weapon ability (granted by an item)</option>
        </Select>
        <Num
          label="Focus cost"
          value={v.focusCost}
          min={0}
          max={10}
          onChange={(focusCost) => set({ focusCost })}
        />
        <Num
          label="Mana cost"
          value={v.manaCost}
          min={0}
          max={100}
          onChange={(manaCost) => set({ manaCost })}
        />
        <Select
          label="Targets"
          value={v.targeting.side}
          onChange={(side) =>
            setTargeting(side === 'self' ? { side, area: 'single', reach: 'any' } : { side })
          }
        >
          <option value="enemy">Enemies</option>
          <option value="ally">Allies</option>
          <option value="self">Self</option>
        </Select>
        {v.targeting.side !== 'self' && (
          <>
            <Select
              label="Reach"
              value={reachOf(v.targeting.reach)}
              onChange={(r) =>
                setTargeting({
                  reach: (COMBAT_COLUMNS as readonly string[]).includes(r)
                    ? [r as CombatColumn]
                    : (r as 'first' | 'first2' | 'any'),
                })
              }
            >
              {(Object.keys(REACH_LABELS) as ReachOption[]).map((r) => (
                <option key={r} value={r}>
                  {REACH_LABELS[r]}
                </option>
              ))}
            </Select>
            <Select
              label="Area"
              value={v.targeting.area}
              onChange={(area) => setTargeting({ area })}
            >
              <option value="single">One unit</option>
              <option value="column">Whole column (2 units)</option>
              <option value="all">Whole side</option>
            </Select>
          </>
        )}
      </div>

      <div className="stack adm-effects">
        <span className="legend">Effects</span>
        {v.effects.map((e, i) => (
          <EffectRow
            key={i}
            effect={e}
            onChange={(next) => setEffect(i, next)}
            onRemove={
              v.effects.length > 1
                ? () => set({ effects: v.effects.filter((_, j) => j !== i) })
                : undefined
            }
          />
        ))}
        {v.effects.length < 6 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => set({ effects: [...v.effects, EFFECT_DEFAULTS.status] })}
          >
            Add effect
          </button>
        )}
      </div>

      <div>
        <span className="legend">Scaling (% weight per attribute; built-in weapons use 60/40)</span>
        <div className="adm-grid">
          {ATTRIBUTE_KEYS.map((k) => (
            <Num
              key={k}
              label={ATTRIBUTE_NAMES[k]}
              value={Math.round((v.scaling[k] ?? 0) * 100)}
              min={0}
              max={200}
              step={10}
              onChange={(n) => {
                const scaling = { ...v.scaling };
                if (n) scaling[k] = n / 100;
                else delete scaling[k];
                set({ scaling });
              }}
            />
          ))}
        </div>
      </div>

      <div className="alert alert-info adm-preview" data-testid="ability-preview">
        <strong>{v.name || 'Unnamed'}</strong> · {v.focusCost} Focus
        {v.manaCost ? ` · ${v.manaCost} Mana` : ''} · {describeTargeting(preview.targeting)}
        <br />
        {describeEffects(preview).join(' · ')}
        {Object.keys(v.scaling).length ? ` · scales with ${describeScaling(v.scaling)}` : ''}
      </div>

      <FormError error={save.error} />
      {save.isSuccess && <div className="alert alert-info">Saved.</div>}
      <button
        className="btn btn-primary"
        disabled={save.isPending || !v.name.trim()}
        onClick={() =>
          save.mutate(
            { id: savedId, input: v },
            {
              onSuccess: (a) => {
                setSavedId(a.id);
                setV(a);
                props.onSaved(a);
              },
            },
          )
        }
      >
        {savedId ? 'Save changes' : 'Create ability'}
      </button>
    </div>
  );
}

function EffectRow(props: {
  effect: CustomAbilityEffect;
  onChange: (e: CustomAbilityEffect) => void;
  onRemove?: () => void;
}) {
  const e = props.effect;
  return (
    <div className="adm-inline adm-effect">
      <Select
        label="Effect"
        value={e.kind}
        onChange={(kind) => props.onChange(EFFECT_DEFAULTS[kind])}
      >
        <option value="damage">Damage</option>
        <option value="heal">Heal</option>
        <option value="block">Dodge</option>
        <option value="status">Status</option>
      </Select>
      {e.kind === 'damage' && (
        <Select
          label="Damage type"
          value={e.damageType}
          onChange={(damageType) => props.onChange({ ...e, damageType })}
        >
          <option value="physical">Physical</option>
          <option value="ranged">Ranged</option>
          <option value="magic">Magic</option>
        </Select>
      )}
      {e.kind !== 'status' ? (
        <>
          <Num
            label="Min"
            value={e.min}
            min={0}
            onChange={(min) => props.onChange({ ...e, min })}
          />
          <Num
            label="Max"
            value={e.max}
            min={0}
            onChange={(max) => props.onChange({ ...e, max })}
          />
        </>
      ) : (
        <>
          <Select
            label="Status"
            value={e.status}
            onChange={(status: StatusId) => props.onChange({ ...e, status })}
          >
            {STATUS_IDS.map((s) => (
              <option key={s} value={s}>
                {STATUS_NAMES[s]}
              </option>
            ))}
          </Select>
          <Num
            label="Turns"
            value={e.turns}
            min={1}
            max={10}
            onChange={(turns) => props.onChange({ ...e, turns })}
          />
          <Num
            label="Value / turn"
            value={e.value ?? 0}
            min={0}
            onChange={(value) => props.onChange({ ...e, value })}
          />
        </>
      )}
      {e.kind === 'damage' && (
        <Select
          label="Bonus vs"
          value={e.bonusVs?.status ?? ''}
          onChange={(status) => {
            const { bonusVs: _drop, ...rest } = e;
            props.onChange(
              status
                ? {
                    ...rest,
                    bonusVs: {
                      status: status as StatusId,
                      multiplier: e.bonusVs?.multiplier ?? 1.5,
                    },
                  }
                : rest,
            );
          }}
        >
          <option value="">—</option>
          {STATUS_IDS.map((s) => (
            <option key={s} value={s}>
              {STATUS_NAMES[s]}
            </option>
          ))}
        </Select>
      )}
      {e.kind === 'damage' && e.bonusVs && (
        <Num
          label="Multiplier"
          value={e.bonusVs.multiplier}
          min={1}
          max={10}
          step={0.1}
          onChange={(multiplier) =>
            props.onChange({ ...e, bonusVs: { ...e.bonusVs!, multiplier } })
          }
        />
      )}
      {props.onRemove && (
        <button
          className="btn btn-ghost btn-sm"
          aria-label="Remove effect"
          onClick={props.onRemove}
        >
          ✕
        </button>
      )}
    </div>
  );
}
