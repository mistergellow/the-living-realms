import { ATTRIBUTE_NAMES } from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  type AdminCharacterDto,
  type Attributes,
  type CustomContentDto,
  type ItemDto,
} from '@realms/shared';
import { useState } from 'react';
import { FormError } from '../../shared/ui/FormError';
import { useAdminCharacter, useAdminCharacterAction, useAdminCharacters } from './api';
import { abilityGroups, itemGroups } from './catalog';
import { Num, Select } from './fields';

/** Admin → Characters: pick any character, then change its items, abilities and numbers. */
export function CharacterTools({ custom }: { custom: CustomContentDto | undefined }) {
  const list = useAdminCharacters();
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const shown = (list.data?.characters ?? []).filter((c) =>
    `${c.name} ${c.accountEmail}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="adm-split">
      <aside className="panel adm-list">
        <input
          className="adm-filter"
          placeholder="Filter by name or email"
          aria-label="Filter characters"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <FormError error={list.error} />
        <ul>
          {shown.map((c) => (
            <li key={c.id}>
              <button
                className={`adm-pick${c.id === selected ? ' is-active' : ''}`}
                onClick={() => setSelected(c.id)}
              >
                <strong>{c.name}</strong>
                <span className="muted">
                  {c.accountEmail}
                  {c.inRift ? ' · in a Rift' : ''}
                </span>
              </button>
            </li>
          ))}
          {list.data && shown.length === 0 && <li className="muted">No characters.</li>}
        </ul>
      </aside>
      <section className="adm-detail">
        {selected ? (
          <CharacterPanel key={selected} id={selected} custom={custom} />
        ) : (
          <p className="muted">Choose a character on the left.</p>
        )}
      </section>
    </div>
  );
}

function CharacterPanel({ id, custom }: { id: string; custom: CustomContentDto | undefined }) {
  const q = useAdminCharacter(id);
  const action = useAdminCharacterAction(id);
  if (q.isPending) return <p className="muted">Loading…</p>;
  if (!q.data) return <FormError error={q.error} />;
  const dto = q.data;
  const { sheet } = dto;
  const run = action.mutate;

  return (
    <div className="stack">
      <header className="adm-head">
        <h2>{sheet.character.name}</h2>
        <span className="muted">{dto.accountEmail}</span>
      </header>
      <FormError error={action.error} />

      <NumbersPanel
        key={`${sheet.reputation}-${sheet.attributePoints}-${ATTRIBUTE_KEYS.map((k) => sheet.baseAttributes[k]).join()}`}
        dto={dto}
        busy={action.isPending}
        onSave={(body) => run({ type: 'update', body })}
      />

      <div className="panel adm-card">
        <h3 className="panel-title">
          <span>Items</span>
        </h3>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Slot</th>
              <th>Quality</th>
              <th>Upgrade</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...Object.values(sheet.equipment), ...sheet.inventory]
              .filter((i): i is ItemDto => !!i)
              .map((i) => (
                <ItemRow
                  key={`${i.id}-${i.quality}-${i.weapon?.upgradeLevel ?? 0}`}
                  item={i}
                  busy={action.isPending}
                  onSave={(body) => run({ type: 'updateItem', itemId: i.id, body })}
                  onRemove={() => run({ type: 'removeItem', itemId: i.id })}
                />
              ))}
          </tbody>
        </table>
        <GrantItem
          custom={custom}
          busy={action.isPending}
          onGrant={(body) => run({ type: 'grant', body })}
        />
      </div>

      <div className="panel adm-card">
        <h3 className="panel-title">
          <span>Abilities</span>
        </h3>
        <p className="muted adm-note">In combat: {sheet.abilities.map((a) => a.name).join(', ')}</p>
        <ul className="adm-chips">
          {dto.learnedSkillIds.map((sid) => (
            <li key={sid}>
              {sheet.abilities.find((a) => a.id === sid)?.name ?? sid}
              <button
                className="btn btn-ghost btn-sm"
                disabled={action.isPending}
                aria-label={`Forget ${sid}`}
                onClick={() => run({ type: 'forget', abilityId: sid })}
              >
                ✕
              </button>
            </li>
          ))}
          {dto.learnedSkillIds.length === 0 && <li className="muted">No learned abilities.</li>}
        </ul>
        <TeachAbility
          custom={custom}
          busy={action.isPending}
          onTeach={(abilityId) => run({ type: 'teach', abilityId })}
        />
      </div>
    </div>
  );
}

function NumbersPanel(props: {
  dto: AdminCharacterDto;
  busy: boolean;
  onSave: (body: { attributes: Attributes; attributePoints: number; reputation: number }) => void;
}) {
  const { sheet } = props.dto;
  const [attributes, setAttributes] = useState<Attributes>(sheet.baseAttributes);
  const [points, setPoints] = useState(sheet.attributePoints);
  const [reputation, setReputation] = useState(sheet.reputation);
  return (
    <div className="panel adm-card">
      <h3 className="panel-title">
        <span>Base attributes &amp; reputation</span>
      </h3>
      <div className="adm-grid">
        {ATTRIBUTE_KEYS.map((k) => (
          <Num
            key={k}
            label={ATTRIBUTE_NAMES[k]}
            value={attributes[k]}
            min={0}
            max={99}
            onChange={(n) => setAttributes({ ...attributes, [k]: n })}
          />
        ))}
        <Num label="Unspent points" value={points} min={0} max={999} onChange={setPoints} />
        <Num label="Reputation" value={reputation} min={0} onChange={setReputation} />
      </div>
      <button
        className="btn btn-primary btn-sm"
        disabled={props.busy}
        onClick={() => props.onSave({ attributes, attributePoints: points, reputation })}
      >
        Save numbers
      </button>
    </div>
  );
}

function ItemRow(props: {
  item: ItemDto;
  busy: boolean;
  onSave: (body: { quality: number; upgradeLevel: number }) => void;
  onRemove: () => void;
}) {
  const { item } = props;
  const [quality, setQuality] = useState(item.quality);
  const [upgrade, setUpgrade] = useState(item.weapon?.upgradeLevel ?? 0);
  const changed = quality !== item.quality || upgrade !== (item.weapon?.upgradeLevel ?? 0);
  return (
    <tr>
      <td>
        {item.name}
        <span className="muted mono adm-id">{item.defId}</span>
      </td>
      <td>{item.equippedSlot ?? 'bag'}</td>
      <td>
        <input
          type="number"
          min={0}
          max={100}
          value={quality}
          aria-label={`Quality of ${item.name}`}
          onChange={(e) => setQuality(Number(e.target.value))}
        />
      </td>
      <td>
        <input
          type="number"
          min={0}
          max={10}
          value={upgrade}
          disabled={!item.weapon}
          aria-label={`Upgrade of ${item.name}`}
          onChange={(e) => setUpgrade(Number(e.target.value))}
        />
      </td>
      <td className="adm-actions">
        <button
          className="btn btn-sm"
          disabled={props.busy || !changed}
          onClick={() => props.onSave({ quality, upgradeLevel: upgrade })}
        >
          Save
        </button>
        <button
          className="btn btn-danger btn-sm"
          disabled={props.busy}
          aria-label={`Remove ${item.name}`}
          onClick={props.onRemove}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

function GrantItem(props: {
  custom: CustomContentDto | undefined;
  busy: boolean;
  onGrant: (body: { defId: string; upgradeLevel: number; quality: number }) => void;
}) {
  const groups = itemGroups(props.custom);
  const [defId, setDefId] = useState(groups[0]?.entries[0]?.id ?? '');
  const [upgradeLevel, setUpgrade] = useState(0);
  const [quality, setQuality] = useState(100);
  return (
    <div className="adm-inline">
      <Select label="Give item" value={defId} onChange={setDefId}>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.entries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <Num label="Upgrade" value={upgradeLevel} min={0} max={10} onChange={setUpgrade} />
      <Num label="Quality" value={quality} min={0} max={100} onChange={setQuality} />
      <button
        className="btn btn-primary btn-sm"
        disabled={props.busy || !defId}
        onClick={() => props.onGrant({ defId, upgradeLevel, quality })}
      >
        Give
      </button>
    </div>
  );
}

function TeachAbility(props: {
  custom: CustomContentDto | undefined;
  busy: boolean;
  onTeach: (abilityId: string) => void;
}) {
  const groups = abilityGroups(props.custom);
  const [abilityId, setAbilityId] = useState(groups[0]?.entries[0]?.id ?? '');
  return (
    <div className="adm-inline">
      <Select label="Teach ability" value={abilityId} onChange={setAbilityId}>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.entries.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <button
        className="btn btn-primary btn-sm"
        disabled={props.busy || !abilityId}
        onClick={() => props.onTeach(abilityId)}
      >
        Teach
      </button>
    </div>
  );
}
