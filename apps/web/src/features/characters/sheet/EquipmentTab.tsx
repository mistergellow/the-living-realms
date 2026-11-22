import {
  getItemDef,
  INVENTORY_RULES,
  ATTRIBUTE_SUMMARIES,
  attributeEffects,
} from '@realms/game-core';
import { Rich } from '../../../shared/ui/Rich';
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
import { ITEM_FILTERS, itemMatches, type ItemFilter } from './item-filters';
import { DropDialog, GridTools, ItemGrid, ItemMenu, parseCellKey, SplitDialog } from './ItemGrid';
import { useInventoryActions } from '../../city/api';
import { LEFT_SLOTS, RIGHT_SLOTS, SLOT_LABELS } from './slots';

type Filter = ItemFilter;
const FILTERS = ITEM_FILTERS;
/** Request #59: the bag is a 5 × 4 grid of fixed positions. */
const COLS = 5;

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
  const { equip, unequip, use, drop } = useEquipment(characterId);
  const allocate = useAllocateAttributes(characterId);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const inv = useInventoryActions(characterId);
  const [split, setSplit] = useState<{ item: ItemDto; slot: number } | null>(null);
  // Request #65: right-click menu on a bag item, and the drop confirmation.
  const [menu, setMenu] = useState<{ item: ItemDto; at: { x: number; y: number } } | null>(null);
  const [dropping, setDropping] = useState<ItemDto | null>(null);
  const busy =
    equip.isPending ||
    unequip.isPending ||
    use.isPending ||
    drop.isPending ||
    inv.move.isPending ||
    inv.sort.isPending;
  /** Skill Books (request #47): double-click to read and learn. */
  const read = (item: ItemDto) => {
    if (busy) return;
    tip.clear();
    use.mutate(item.id);
  };
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

  const dnd = useDragAndDrop<Drag>((d, target, mods) => {
    tip.clear();
    if (!target) return;
    // Request #59: a bag cell — arrange, stack, split, or take gear off onto it.
    const cell = parseCellKey(target);
    if (cell) {
      if (busy) return;
      if (d.from === 'inventory' && d.item.slot === cell.slot) return;
      if (mods.shift && d.from === 'inventory' && d.item.quantity > 1)
        setSplit({ item: d.item, slot: cell.slot });
      else inv.move.mutate({ itemId: d.item.id, to: 'bag', slot: cell.slot });
      return;
    }
    if (target === 'inventory') {
      if (d.from !== 'inventory') doUnequip(d.from);
      return;
    }
    doEquip(d.item, target as EquipSlot);
  });
  const dragging = dnd.drag?.payload.item ?? null;

  // The tooltip follows the live sheet: an item that just moved closes it.
  const hovered = tip.hover
    ? [...s.inventory, ...Object.values(s.equipment)].find(
        (i) => i?.id === tip.hover!.value.id && i.equippedSlot === tip.hover!.value.equippedSlot,
      )
    : undefined;

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
      <FormError
        error={
          equip.error ??
          unequip.error ??
          use.error ??
          drop.error ??
          allocate.error ??
          inv.move.error ??
          inv.sort.error
        }
      />
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
                size={170}
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
        >
          <div className="panel-title">
            <span data-testid="bag-count">
              Inventory ({s.inventory.length}/{INVENTORY_RULES.bagSlots})
            </span>
          </div>
          <GridTools
            label="bag"
            search={search}
            onSearch={setSearch}
            onSort={() => inv.sort.mutate('bag')}
            sortDisabled={busy}
          >
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
          </GridTools>
          <div className="bag-scroll">
            <ItemGrid
              place="bag"
              items={s.inventory}
              size={INVENTORY_RULES.bagSlots}
              cols={COLS}
              over={dnd.drag?.over ?? null}
              dimmed={(i) => !itemMatches(i, filter, search)}
              bind={(item) => dnd.bind({ item, from: 'inventory' }, !busy)}
              tip={(item) => tip.props(item)}
              onDoubleClick={(item) =>
                getItemDef(item.defId)?.teaches ? read(item) : doEquip(item, quickSlot(item, s))
              }
              onContextMenu={(item, at) => {
                if (busy) return;
                tip.clear();
                setMenu({ item, at });
              }}
              testId="inventory"
            />
          </div>
          <p className="doll-hint">
            Drag to arrange · drop on the same item to stack · Shift + drop to split · right click
            for more
          </p>
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
                      <tr key={k} className="attr-row">
                        <th>
                          <span className="attr-name" tabIndex={0} data-testid={`attr-help-${k}`}>
                            {ATTRIBUTE_NAMES[k]}
                            {/* Request #50: what the attribute does, for new players. */}
                            <span className="attr-tip" role="tooltip">
                              <strong>{ATTRIBUTE_NAMES[k]}</strong>
                              <span className="muted">{ATTRIBUTE_SUMMARIES[k]}</span>
                              <ul>
                                {attributeEffects(k).map((line) => (
                                  <li key={line}>
                                    <Rich text={line} />
                                  </li>
                                ))}
                              </ul>
                              <span className="muted small">
                                Base {s.baseAttributes[k]}
                                {bonus !== 0 ? `, gear ${fmt(bonus)}` : ''}. Requirements and
                                exploration tests use the base value only.
                              </span>
                            </span>
                          </span>
                        </th>
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
      {menu && (
        <ItemMenu
          at={menu.at}
          onClose={() => setMenu(null)}
          actions={[
            ...(getItemDef(menu.item.defId)?.teaches
              ? [{ label: 'Read', onSelect: () => read(menu.item) }]
              : menu.item.slots.length
                ? [{ label: 'Equip', onSelect: () => doEquip(menu.item, quickSlot(menu.item, s)) }]
                : []),
            {
              label: 'Drop',
              danger: true,
              testId: 'item-menu-drop',
              onSelect: () => setDropping(menu.item),
            },
          ]}
        />
      )}
      {dropping && (
        <DropDialog
          item={dropping}
          onCancel={() => setDropping(null)}
          onConfirm={(qty) => {
            drop.mutate({ itemId: dropping.id, qty });
            setDropping(null);
          }}
        />
      )}
      {split && (
        <SplitDialog
          item={split.item}
          onCancel={() => setSplit(null)}
          onConfirm={(qty) => {
            inv.move.mutate({ itemId: split.item.id, to: 'bag', slot: split.slot, qty });
            setSplit(null);
          }}
        />
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
