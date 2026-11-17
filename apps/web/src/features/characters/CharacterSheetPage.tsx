import { ATTRIBUTE_NAMES } from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type Attributes,
  type CharacterSheetDto,
  type EquipSlot,
  type ItemDto,
} from '@realms/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AttributePicker } from './AttributePicker';
import { FormError } from '../../shared/ui/FormError';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { useActiveCharacter } from './active-character';
import { useAllocateAttributes, useCharacterSheet, useEquipment } from './api';
import { CharacterToken } from './CharacterToken';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { offhandArtFor, weaponArtFor } from '../avatar/weapon-art';

const SLOT_LABELS: Record<EquipSlot, string> = {
  mainHand: 'Main hand',
  offHand: 'Off hand',
  head: 'Head',
  body: 'Body',
  legs: 'Legs',
  accessory1: 'Accessory',
  accessory2: 'Accessory',
};

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
    <div className="allocate panel" data-testid="allocate">
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

const LEFT_SLOTS: EquipSlot[] = ['mainHand', 'head', 'accessory1', 'offHand'];
const RIGHT_SLOTS: EquipSlot[] = ['body', 'legs', 'accessory2'];

function SlotTile(props: {
  slot: EquipSlot;
  item: ItemDto | null;
  busy: boolean;
  onUnequip: () => void;
}) {
  const { slot, item } = props;
  return (
    <div className="slot-tile" data-empty={!item} data-broken={item?.broken ?? false}>
      <span className="slot-label">{SLOT_LABELS[slot]}</span>
      {item ? (
        <>
          <strong className="slot-item">{item.name}</strong>
          <QualityBar quality={item.quality} />
          <button
            className="btn btn-ghost btn-sm"
            disabled={props.busy}
            onClick={props.onUnequip}
            aria-label={`Unequip ${item.name}`}
          >
            Unequip
          </button>
        </>
      ) : (
        <span className="muted">Empty</span>
      )}
    </div>
  );
}

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** First allowed slot that is free, otherwise the first allowed slot (swap). */
function targetSlot(item: ItemDto, sheet: CharacterSheetDto): EquipSlot | undefined {
  return item.slots.find((s) => !sheet.equipment[s]) ?? item.slots[0];
}

function QualityBar({ quality }: { quality: number }) {
  const tone = quality <= 0 ? 'var(--danger)' : quality <= 25 ? 'var(--warning)' : 'var(--success)';
  return (
    <span className="quality" title={`Quality ${quality}/100`}>
      <span style={{ width: `${quality}%`, background: tone }} />
    </span>
  );
}

function ItemLine({ item }: { item: ItemDto }) {
  const extras = [
    item.armor ? `Armor +${item.armor}` : null,
    item.magicResist ? `Resist +${item.magicResist}` : null,
    ...Object.entries(item.bonuses).map(
      ([k, v]) => `${ATTRIBUTE_NAMES[k as AttributeKey]} ${fmt(v ?? 0)}`,
    ),
    item.twoHanded ? 'Two-handed' : null,
  ].filter(Boolean);
  return (
    <div className="item-line">
      <div className="row" style={{ gap: 8 }}>
        <strong
          style={
            item.broken ? { color: 'var(--danger)', textDecoration: 'line-through' } : undefined
          }
        >
          {item.name}
        </strong>
        {item.broken && <span className="field-error">Broken</span>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <QualityBar quality={item.quality} />
        <span className="field-hint">{extras.join(' · ') || item.description}</span>
      </div>
    </div>
  );
}

export function CharacterSheetPage() {
  const { id = '' } = useParams();
  const sheet = useCharacterSheet(id);
  const { equip, unequip } = useEquipment(id);
  const allocate = useAllocateAttributes(id);
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();

  if (sheet.isPending) return <FullPageMessage>Loading character…</FullPageMessage>;
  if (sheet.isError) return <FullPageMessage>Character not found.</FullPageMessage>;
  const s = sheet.data;
  const busy = equip.isPending || unequip.isPending;

  return (
    <main className="page sheet">
      <header className="page-header">
        <CharacterToken appearance={s.character.appearance} size={56} />
        <div>
          <h1 data-testid="sheet-name">{s.character.name}</h1>
          <span className="muted">
            Reputation <strong data-testid="reputation">{s.reputation}</strong>
          </span>
        </div>
        <span className="spacer" />
        <Link className="btn btn-ghost btn-sm" to="/characters">
          Characters
        </Link>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            select(s.character.id);
            navigate('/world');
          }}
        >
          Play
        </button>
      </header>

      <FormError error={equip.error ?? unequip.error ?? allocate.error} />

      <div className="sheet-grid">
        <section className="panel span-2 hero" data-testid="equipment">
          <div className="hero-slots">
            {LEFT_SLOTS.map((slot) => (
              <SlotTile
                key={slot}
                slot={slot}
                item={s.equipment[slot]}
                busy={busy}
                onUnequip={() => unequip.mutate({ slot })}
              />
            ))}
          </div>
          <div className="hero-center">
            <div className="hero-stage">
              <CharacterAvatar
                appearance={s.character.appearance}
                weapon={weaponArtFor(
                  s.equipment.mainHand?.broken ? null : s.equipment.mainHand?.defId,
                )}
                offhand={offhandArtFor(
                  s.equipment.offHand?.broken ? null : s.equipment.offHand?.defId,
                )}
                size={230}
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
                <span>Initiative</span>
                <strong>{fmt(s.stats.initiative)}</strong>
              </div>
            </div>
          </div>
          <div className="hero-slots">
            {RIGHT_SLOTS.map((slot) => (
              <SlotTile
                key={slot}
                slot={slot}
                item={s.equipment[slot]}
                busy={busy}
                onUnequip={() => unequip.mutate({ slot })}
              />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Attributes</div>
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
        </section>

        <section className="panel">
          <div className="panel-title">Combat stats</div>
          <table className="kv">
            <tbody>
              <tr>
                <th>HP</th>
                <td>{s.stats.maxHp}</td>
              </tr>
              <tr>
                <th>Mana</th>
                <td>{s.stats.maxMana}</td>
              </tr>
              <tr>
                <th>Armor</th>
                <td>{`${s.stats.armor} (−${s.stats.physicalReduction}%)`}</td>
              </tr>
              <tr>
                <th>Magic resist</th>
                <td>{`${s.stats.magicResist} (−${s.stats.magicReduction}%)`}</td>
              </tr>
              <tr>
                <th>Initiative</th>
                <td>{s.stats.initiative}</td>
              </tr>
              <tr>
                <th>Dodge</th>
                <td>{`${s.stats.dodgeChance}%`}</td>
              </tr>
              <tr>
                <th>Critical chance</th>
                <td>{`${s.stats.critChance}%`}</td>
              </tr>
              <tr>
                <th>Critical damage</th>
                <td>{`${s.stats.critDamage}%`}</td>
              </tr>
              <tr>
                <th>Healing done</th>
                <td>{`+${s.stats.healingPower}%`}</td>
              </tr>
              <tr>
                <th>Healing received</th>
                <td>{`+${s.stats.healingReceived}%`}</td>
              </tr>
              <tr>
                <th>Mana per turn</th>
                <td>{s.stats.manaRegen}</td>
              </tr>
              <tr>
                <th>Status potency</th>
                <td>{`+${s.stats.effectPotency}%`}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="panel span-2">
          <div className="panel-title">Inventory ({s.inventory.length})</div>
          {s.inventory.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No unequipped items. Rifts will drop loot.
            </p>
          ) : (
            <ul className="slot-list" data-testid="inventory">
              {s.inventory.map((item) => {
                const slot = targetSlot(item, s);
                return (
                  <li key={item.id}>
                    <ItemLine item={item} />
                    <button
                      className="btn btn-sm"
                      disabled={busy || item.broken || !slot}
                      onClick={() => slot && equip.mutate({ itemId: item.id, slot })}
                      aria-label={`Equip ${item.name}`}
                    >
                      Equip
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel span-2">
          <div className="panel-title">Abilities in combat</div>
          <ul className="ability-list" data-testid="abilities">
            {s.abilities.map((a) => (
              <li key={a.id}>
                <div className="row" style={{ gap: 8 }}>
                  <strong>{a.name}</strong>
                  <span className="cost">{a.focusCost} Focus</span>
                  {a.manaCost > 0 && <span className="cost mana">{a.manaCost} Mana</span>}
                  <span className="spacer" />
                  <span className="field-hint">
                    {a.grantedBy ?? (a.source === 'universal' ? 'Always available' : 'Learned')}
                  </span>
                </div>
                <div className="field-hint">
                  {[a.targeting, ...a.effects].join(' · ')}
                  {a.scaling && <> · scales with {a.scaling}</>}
                </div>
                <div className="field-hint">{a.description}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
