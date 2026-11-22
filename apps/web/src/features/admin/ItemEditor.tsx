import { ATTRIBUTE_NAMES, WEAPON_TYPES, getWeaponType } from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  ITEM_KINDS,
  type CustomContentDto,
  type CustomItemDto,
  type CustomItemInput,
  type EquipSlot,
} from '@realms/shared';
import { useState } from 'react';
import { FormError } from '../../shared/ui/FormError';
import { useSaveCustomItem } from './api';
import { abilityGroups } from './catalog';
import { Num, Select, Text } from './fields';

/*
 * Admin → Items: create or edit a custom weapon, off-hand, armor piece or
 * accessory. Weapons pick a catalogue type, which gives the basic attack,
 * hands and art (every weapon of a type shares them, request #31).
 */

const EMPTY: CustomItemInput = {
  name: '',
  description: '',
  kind: 'weapon',
  slots: ['mainHand'],
  weaponType: 'sword',
  abilities: [],
  bonuses: {},
  armor: 0,
  magicResist: 0,
};

const ARMOR_SLOTS: EquipSlot[] = ['head', 'face', 'body', 'belt', 'feet'];
/** Accessories are rings (either ring slot) or a pendant. */
const ACCESSORY_KINDS = { ring: ['ring1', 'ring2'], pendant: ['pendant'] } as const;

export function ItemEditor({ custom }: { custom: CustomContentDto | undefined }) {
  const [editing, setEditing] = useState<CustomItemDto | null>(null);
  const [formKey, setFormKey] = useState(0);
  const items = custom?.items ?? [];
  const start = (item: CustomItemDto | null) => {
    setEditing(item);
    setFormKey((k) => k + 1);
  };
  return (
    <div className="adm-split">
      <aside className="panel adm-list">
        <button className="btn btn-primary btn-sm" onClick={() => start(null)}>
          New item
        </button>
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              <button
                className={`adm-pick${editing?.id === i.id ? ' is-active' : ''}`}
                onClick={() => start(i)}
              >
                <strong>{i.name}</strong>
                <span className="muted">
                  {i.kind}
                  {i.weaponType ? ` · ${i.weaponType}` : ''}
                </span>
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="muted">No custom items yet.</li>}
        </ul>
      </aside>
      <section className="adm-detail">
        <ItemForm
          key={formKey}
          initial={editing}
          custom={custom}
          onSaved={(saved) => setEditing(saved)}
        />
      </section>
    </div>
  );
}

function ItemForm(props: {
  initial: CustomItemDto | null;
  custom: CustomContentDto | undefined;
  onSaved: (item: CustomItemDto) => void;
}) {
  const save = useSaveCustomItem();
  const [v, setV] = useState<CustomItemInput>(props.initial ?? EMPTY);
  const [savedId, setSavedId] = useState<string | null>(props.initial?.id ?? null);
  const set = (patch: Partial<CustomItemInput>) => setV((old) => ({ ...old, ...patch }));

  const catalogueType = v.kind === 'weapon' ? getWeaponType(v.weaponType) : undefined;
  const oneHanded = catalogueType?.hands === 1;

  // Slots follow the kind (the server checks them against the equipment rules).
  const changeKind = (kind: CustomItemInput['kind']) => {
    if (kind === 'weapon') set({ kind, slots: ['mainHand'], weaponType: 'sword' });
    else if (kind === 'offhand') set({ kind, slots: ['offHand'], weaponType: 'shield' });
    else if (kind === 'armor') set({ kind, slots: ['body'], weaponType: undefined });
    else set({ kind, slots: [...ACCESSORY_KINDS.ring], weaponType: undefined });
  };
  const toggleAbility = (id: string) =>
    set({
      abilities: v.abilities.includes(id)
        ? v.abilities.filter((a) => a !== id)
        : [...v.abilities, id],
    });

  return (
    <div className="panel adm-card stack">
      <h3 className="panel-title">
        <span>{savedId ? 'Edit item' : 'New item'}</span>
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
        <Select label="Kind" value={v.kind} onChange={changeKind}>
          {ITEM_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>

        {v.kind === 'weapon' && (
          <Select
            label="Weapon type"
            value={v.weaponType ?? 'sword'}
            onChange={(weaponType) =>
              set({
                weaponType,
                slots: getWeaponType(weaponType)?.hands === 1 ? v.slots : ['mainHand'],
              })
            }
          >
            {Object.values(WEAPON_TYPES).map((w) => (
              <option key={w.type} value={w.type}>
                {w.name} ({w.hands === 2 ? 'two hands' : 'one hand'})
              </option>
            ))}
          </Select>
        )}
        {v.kind === 'offhand' && (
          <Select
            label="Off-hand type"
            value={v.weaponType ?? 'shield'}
            onChange={(weaponType) => set({ weaponType })}
          >
            <option value="shield">Shield</option>
            <option value="talisman">Talisman</option>
          </Select>
        )}
        {v.kind === 'armor' && (
          <Select
            label="Armor slot"
            value={v.slots[0] ?? 'body'}
            onChange={(slot) => set({ slots: [slot] })}
          >
            {ARMOR_SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        )}
        {v.kind === 'accessory' && (
          <Select
            label="Accessory type"
            value={v.slots.includes('pendant') ? 'pendant' : 'ring'}
            onChange={(k: keyof typeof ACCESSORY_KINDS) => set({ slots: [...ACCESSORY_KINDS[k]] })}
          >
            <option value="ring">Ring</option>
            <option value="pendant">Pendant</option>
          </Select>
        )}
        {v.kind === 'weapon' && oneHanded && (
          <label className="adm-check">
            <input
              type="checkbox"
              checked={v.slots.includes('offHand')}
              onChange={(e) =>
                set({ slots: e.target.checked ? ['mainHand', 'offHand'] : ['mainHand'] })
              }
            />
            Can also be held in the off hand
          </label>
        )}
      </div>

      {catalogueType && (
        <p className="muted adm-note">
          Basic attack: <strong>{catalogueType.basicAttack}</strong> (always first) ·{' '}
          {catalogueType.baseDamage.min}–{catalogueType.baseDamage.max} damage · scales with{' '}
          {ATTRIBUTE_NAMES[catalogueType.primary]}
          {catalogueType.secondary ? ` + ${ATTRIBUTE_NAMES[catalogueType.secondary]}` : ''}
        </p>
      )}

      <div>
        <span className="legend">Abilities granted while equipped</span>
        <div className="adm-ability-pick">
          {abilityGroups(props.custom).map((g) => (
            <fieldset key={g.label}>
              <legend>{g.label}</legend>
              {g.entries.map((a) => (
                <label key={a.id} className="adm-check" title={a.description}>
                  <input
                    type="checkbox"
                    checked={v.abilities.includes(a.id)}
                    onChange={() => toggleAbility(a.id)}
                  />
                  {a.name}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </div>

      <div className="adm-grid">
        {ATTRIBUTE_KEYS.map((k) => (
          <Num
            key={k}
            label={`+ ${ATTRIBUTE_NAMES[k]}`}
            value={v.bonuses[k] ?? 0}
            min={-50}
            max={50}
            onChange={(n) => {
              const bonuses = { ...v.bonuses };
              if (n) bonuses[k] = n;
              else delete bonuses[k];
              set({ bonuses });
            }}
          />
        ))}
        <Num label="Armor" value={v.armor} min={0} max={999} onChange={(armor) => set({ armor })} />
        <Num
          label="Magic resist"
          value={v.magicResist}
          min={0}
          max={999}
          onChange={(magicResist) => set({ magicResist })}
        />
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
              onSuccess: (item) => {
                setSavedId(item.id);
                setV(item);
                props.onSaved(item);
              },
            },
          )
        }
      >
        {savedId ? 'Save changes' : 'Create item'}
      </button>
    </div>
  );
}
