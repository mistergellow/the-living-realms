import { ATTRIBUTE_NAMES } from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  type Attributes,
  type CharacterSheetDto,
  type EquipSlot,
  type ItemDto,
} from '@realms/shared';
import { useState } from 'react';
import { FormError } from '../../../shared/ui/FormError';
import { CharacterAvatar } from '../../avatar/CharacterAvatar';
import { offhandArtFor, weaponArtFor } from '../../avatar/weapon-art';
import { AttributePicker } from '../AttributePicker';
import { useAllocateAttributes, useEquipment } from '../api';
import { DragGhost, Tooltip, useDragAndDrop, useHover } from './drag';
import { GlyphSvg, ItemIcon, SLOT_GLYPH } from './ItemIcon';
import { ItemTooltipBody } from './ItemTooltip';
import { LEFT_SLOTS, RIGHT_SLOTS, SLOT_LABELS } from './slots';

type Filter = 'all' | 'gear' | 'material' | 'consumable';
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'gear', label: 'Gear' },
  { id: 'material', label: 'Materials' },
  { id: 'consumable', label: 'Consumables' },
];
const isGear = (i: ItemDto) => i.slots.length > 0;
const matches = (i: ItemDto, f: Filter) => f === 'all' || (f === 'gear' ? isGear(i) : i.kind === f);
/** The inventory grid always shows at least this many cells (empty ones included). */
const MIN_CELLS = 36;
const COLS = 6;

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Drag payload: an item and where it comes from. */
type Drag = { item: ItemDto; from: EquipSlot | 'inventory' };

/** First allowed slot that is free, otherwise the first allowed slot (swap). */
function quickSlot(item: ItemDto, sheet: CharacterSheetDto): EquipSlot | undefined {
  return item.slots.find((s) => !sheet.equipment[s]) ?? item.slots[0];
}

export function EquipmentTab({
  sheet: s,
  characterId,
}: {
  sheet: CharacterSheetDto;
  characterId: string;
}) {
  const { equip, unequip } = useEquipment(characterId);
  const allocate = useAllocateAttributes(characterId);
  const [filter, setFilter] = useState<Filter>('all');
  const busy = equip.isPending || unequip.isPending;
  const tip = useHover<ItemDto>();

  const doEquip = (item: ItemDto, slot: EquipSlot | undefined) => {
    if (!slot || busy || item.broken || !item.slots.includes(slot)) return;
    if (item.equippedSlot === slot) return;
    tip.clear();
    equip.mutate({ itemId: item.id, slot });
  };
  const doUnequip = (slot: EquipSlot) => {
    if (busy) return;
    tip.clear();
    unequip.mutate({ slot });
  };

  const dnd = useDragAndDrop<Drag>((d, target) => {
    tip.clear();
    if (!target) return;
    if (target === 'inventory') {
      if (d.from !== 'inventory') doUnequip(d.from);
      return;
    }
    doEquip(d.item, target as EquipSlot);
  });
  const dragging = dnd.drag?.payload.item ?? null;

  const items = s.inventory.filter((i) => matches(i, filter));
  // The tooltip follows the live sheet: an item that just moved closes it.
  const hovered = tip.hover
    ? [...s.inventory, ...Object.values(s.equipment)].find(
        (i) => i?.id === tip.hover!.value.id && i.equippedSlot === tip.hover!.value.equippedSlot,
      )
    : undefined;
  const cells = Math.max(MIN_CELLS, Math.ceil(items.length / COLS) * COLS);

  const renderSlot = (slot: EquipSlot) => {
    const item = s.equipment[slot];
    const accepts = dragging ? dragging.slots.includes(slot) && !dragging.broken : null;
    return (
      <div
        key={slot}
        className="equip-slot"
        data-drop={slot}
        data-accept={accepts === null ? undefined : accepts}
        data-over={dnd.drag?.over === slot && accepts ? true : undefined}
        data-testid={`slot-${slot}`}
      >
        {item ? (
          <button
            className="equip-item"
            data-broken={item.broken}
            data-rarity={item.rarity}
            aria-label={`${SLOT_LABELS[slot]}: ${item.name}`}
            {...dnd.bind({ item, from: slot }, !busy)}
            {...tip.props(item)}
            onDoubleClick={() => doUnequip(slot)}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || e.key === 'Backspace') doUnequip(slot);
            }}
          >
            <ItemIcon item={item} />
          </button>
        ) : (
          <span className="equip-empty" aria-label={`${SLOT_LABELS[slot]}: empty`}>
            <GlyphSvg glyph={SLOT_GLYPH[slot]} />
          </span>
        )}
        <span className="equip-label">{SLOT_LABELS[slot]}</span>
      </div>
    );
  };

  return (
    <div className="equip-tab">
      <FormError error={equip.error ?? unequip.error ?? allocate.error} />
      <div className="equip-grid">
        <section className="panel paperdoll" data-testid="equipment">
          <div className="doll-col">{LEFT_SLOTS.map(renderSlot)}</div>
          <div className="doll-center">
            <div className="hero-stage">
              <CharacterAvatar
                appearance={s.character.appearance}
                weapon={weaponArtFor(
                  s.equipment.mainHand?.broken ? null : s.equipment.mainHand?.defId,
                )}
                offhand={offhandArtFor(
                  s.equipment.offHand?.broken ? null : s.equipment.offHand?.defId,
                )}
                size={240}
                title={s.character.name}
              />
            </div>
            <div className="hero-stats">
              <div>
                <span>HP</span>
                <strong data-testid="stat-hp">{s.stats.maxHp}</strong>
              </div>
              <div>
                <span>Mana</span>
                <strong>{s.stats.maxMana}</strong>
              </div>
              <div>
                <span>Armor</span>
                <strong>−{s.stats.physicalReduction}%</strong>
              </div>
              <div>
                <span>Focus</span>
                <strong>{s.stats.focusPerRound}</strong>
              </div>
            </div>
          </div>
          <div className="doll-col">{RIGHT_SLOTS.map(renderSlot)}</div>
          <p className="doll-hint">
            Drag items between the bag and the slots · double-click to equip or unequip
          </p>
        </section>

        <section
          className="panel bag"
          data-drop="inventory"
          data-accept={dragging ? dnd.drag?.payload.from !== 'inventory' : undefined}
          data-over={
            dnd.drag?.over === 'inventory' && dnd.drag.payload.from !== 'inventory'
              ? true
              : undefined
          }
        >
          <div className="panel-title">
            <span>Inventory ({s.inventory.length})</span>
          </div>
          <div className="bag-filters" role="tablist" aria-label="Inventory filter">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                className="chip-btn"
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="bag-grid" data-testid="inventory" style={{ ['--cols' as string]: COLS }}>
            {Array.from({ length: cells }, (_, n) => {
              const item = items[n];
              if (!item) return <span key={`e${n}`} className="bag-cell" data-empty />;
              return (
                <button
                  key={item.id}
                  className="bag-cell"
                  aria-label={item.name}
                  data-rarity={item.rarity}
                  data-testid={`bag-${item.defId}`}
                  {...dnd.bind({ item, from: 'inventory' }, !busy && isGear(item) && !item.broken)}
                  {...tip.props(item)}
                  onDoubleClick={() => doEquip(item, quickSlot(item, s))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doEquip(item, quickSlot(item, s));
                  }}
                >
                  <ItemIcon item={item} />
                  {item.quantity > 1 && <span className="bag-qty">{item.quantity}</span>}
                  {isGear(item) && (
                    <span className="bag-q">
                      <i
                        style={{
                          width: `${item.quality}%`,
                          background:
                            item.quality <= 0
                              ? 'var(--danger)'
                              : item.quality <= 25
                                ? 'var(--warning)'
                                : 'var(--success)',
                        }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {s.inventory.length === 0 && (
            <p className="muted bag-empty">Your bag is empty. Rifts and professions fill it.</p>
          )}
        </section>

        <section className="panel sheet-stats">
          <div className="stats-cols">
            <div>
              <div className="panel-title">
                <span>Attributes</span>
              </div>
              {s.attributePoints > 0 && (
                <AllocatePanel
                  key={s.attributePoints}
                  base={s.baseAttributes}
                  points={s.attributePoints}
                  busy={allocate.isPending}
                  onSave={(add) => allocate.mutate({ add })}
                />
              )}
              <table className="kv">
                <tbody>
                  {ATTRIBUTE_KEYS.map((k) => {
                    const bonus = s.attributes[k] - s.baseAttributes[k];
                    return (
                      <tr key={k}>
                        <th>{ATTRIBUTE_NAMES[k]}</th>
                        <td data-testid={`sheet-attr-${k}`}>
                          {s.attributes[k]}
                          {bonus !== 0 && <span className="bonus"> ({fmt(bonus)})</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <div className="panel-title">
                <span>Combat</span>
              </div>
              <table className="kv">
                <tbody>
                  {(
                    [
                      ['Armor', `${s.stats.armor} (−${s.stats.physicalReduction}%)`],
                      ['Magic resist', `${s.stats.magicResist} (−${s.stats.magicReduction}%)`],
                      ['Initiative', s.stats.initiative],
                      ['Focus per round', s.stats.focusPerRound],
                      ['Dodge', `${s.stats.dodgeChance}%`],
                      ['Critical chance', `${s.stats.critChance}%`],
                      ['Critical damage', `${s.stats.critDamage}%`],
                      ['Healing done', `+${s.stats.healingPower}%`],
                      ['Healing received', `+${s.stats.healingReceived}%`],
                      ['Mana per turn', s.stats.manaRegen],
                      ['Status potency', `+${s.stats.effectPotency}%`],
                    ] as const
                  ).map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {hovered && tip.hover && !dnd.drag && (
        <Tooltip anchor={tip.hover.rect}>
          <ItemTooltipBody item={hovered} />
        </Tooltip>
      )}
      {dnd.drag && (
        <DragGhost x={dnd.drag.x} y={dnd.drag.y}>
          <ItemIcon item={dnd.drag.payload.item} />
        </DragGhost>
      )}
    </div>
  );
}

function AllocatePanel(props: {
  base: Attributes;
  points: number;
  busy: boolean;
  onSave: (add: Partial<Attributes>) => void;
}) {
  const [value, setValue] = useState<Attributes>(props.base);
  const add = Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, value[k] - props.base[k]]).filter(([, n]) => n !== 0),
  );
  return (
    <div className="allocate" data-testid="allocate">
      <AttributePicker
        value={value}
        onChange={setValue}
        floor={props.base}
        points={props.points}
        title="Unspent points"
      />
      <button
        className="btn btn-primary btn-sm"
        disabled={props.busy || Object.keys(add).length === 0}
        onClick={() => props.onSave(add)}
      >
        Confirm attributes
      </button>
    </div>
  );
}
