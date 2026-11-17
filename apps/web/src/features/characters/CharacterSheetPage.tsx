import { ATTRIBUTE_NAMES } from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  type CharacterSheetDto,
  type EquipSlot,
  type ItemDto,
} from '@realms/shared';
import { Link, useNavigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { useActiveCharacter } from './active-character';
import { useCharacterSheet, useEquipment } from './api';
import { CharacterToken } from './CharacterToken';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { weaponArtFor } from '../avatar/weapon-art';

const SLOT_LABELS: Record<EquipSlot, string> = {
  mainHand: 'Main hand',
  offHand: 'Off hand',
  head: 'Head',
  body: 'Body',
  legs: 'Legs',
  accessory1: 'Accessory',
  accessory2: 'Accessory',
};

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
    item.defense ? `Defense ${fmt(item.defense)}` : null,
    ...Object.entries(item.bonuses).map(([k, v]) => `${k.toUpperCase()} ${fmt(v ?? 0)}`),
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

      <FormError error={equip.error ?? unequip.error} />

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
                <span>Defense</span>
                <strong>{s.stats.defense}</strong>
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
                <th>Defense</th>
                <td>{s.stats.defense}</td>
              </tr>
              <tr>
                <th>Initiative</th>
                <td>{fmt(s.stats.initiative)}</td>
              </tr>
              <tr>
                <th>Dodge</th>
                <td>{s.stats.dodgeChance}%</td>
              </tr>
              <tr>
                <th>Critical</th>
                <td>{s.stats.critChance}%</td>
              </tr>
              <tr>
                <th>Physical power</th>
                <td>{fmt(s.stats.physicalPower)}</td>
              </tr>
              <tr>
                <th>Ranged power</th>
                <td>{fmt(s.stats.rangedPower)}</td>
              </tr>
              <tr>
                <th>Spell power</th>
                <td>{fmt(s.stats.spellPower)}</td>
              </tr>
              <tr>
                <th>Healing power</th>
                <td>{fmt(s.stats.healingPower)}</td>
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
                  {a.targeting} — {a.description}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
