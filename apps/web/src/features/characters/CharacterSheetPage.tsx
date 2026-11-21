import { ATTRIBUTE_NAMES, ORIGINS } from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type Attributes,
  type CharacterSheetDto,
  type EquipSlot,
  type ItemDto,
} from '@realms/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AttributePicker } from './AttributePicker';
import { FormError } from '../../shared/ui/FormError';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { useActiveCharacter } from './active-character';
import {
  useAllocateAttributes,
  useCharacterSheet,
  useEquipment,
  useReadBook,
  useSetOrigin,
} from './api';
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
        title="Finish your character: unspent points (only once)"
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

/** Old characters (before request #36) choose their country of origin once. */
function OriginPanel(props: { busy: boolean; onSave: (origin: string) => void }) {
  const [origin, setOrigin] = useState<string | null>(null);
  return (
    <section className="panel" data-testid="choose-origin">
      <div className="panel-title">
        <span>Choose your country of origin (only once)</span>
      </div>
      <div className="origin-grid">
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
      <button
        className="btn btn-primary btn-sm"
        style={{ marginTop: '0.5rem' }}
        disabled={props.busy || !origin}
        onClick={() => origin && props.onSave(origin)}
      >
        Confirm origin
      </button>
    </section>
  );
}

function BookInfoLine({ item }: { item: ItemDto }) {
  const b = item.book!;
  return (
    <span className="field-hint" data-testid={`book-${b.skillId}`}>
      {b.school} ·{' '}
      {b.requirement
        ? `needs ${b.requirement.name} ${b.requirement.minimum} (base)`
        : 'anyone can read it'}
      {' · '}your rank {b.currentRank}
      {b.readable ? ` · ${b.chance}% success` : ` · ${b.reason}`}
    </span>
  );
}

/** True until `iso` (from the server, null when free) has passed (reading time cost). */
function useBusyUntil(iso: string | null): boolean {
  const [doneFor, setDoneFor] = useState<string | null>(null);
  useEffect(() => {
    if (!iso) return;
    const t = setTimeout(() => setDoneFor(iso), Math.max(0, Date.parse(iso) - Date.now()) + 50);
    return () => clearTimeout(t);
  }, [iso]);
  return !!iso && doneFor !== iso;
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
    // Weapon catalogue (request #31/#33): type, basic attack cost, specials, runes.
    item.weapon
      ? `${item.weapon.typeName} · ${item.weapon.baseDamage.min}–${item.weapon.baseDamage.max} ${item.weapon.attackType} · basic attack ${item.weapon.basicAttackCost} Focus · specials ${item.weapon.specials.length}/${item.weapon.maxSpecials} · runes ${item.weapon.runeSlots.filter((r) => r.unlocked).length}/${item.weapon.runeSlots.length} unlocked`
      : null,
  ].filter(Boolean);
  return (
    <div className="item-line">
      <div className="row" style={{ gap: '0.5rem' }}>
        <strong
          style={
            item.broken ? { color: 'var(--danger)', textDecoration: 'line-through' } : undefined
          }
        >
          {item.name}
          {item.quantity > 1 ? ` ×${item.quantity}` : ''}
        </strong>
        {item.broken && <span className="field-error">Broken</span>}
      </div>
      <div className="row" style={{ gap: '0.5rem' }}>
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
  const read = useReadBook(id);
  const setOrigin = useSetOrigin(id);
  const reading = useBusyUntil(sheet.data?.readReadyAt ?? null);
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();

  if (sheet.isPending) return <FullPageMessage>Loading character…</FullPageMessage>;
  if (sheet.isError) return <FullPageMessage spinner={false}>Character not found.</FullPageMessage>;
  const s = sheet.data;
  const busy = equip.isPending || unequip.isPending;

  return (
    <Screen>
      <header className="topbar">
        <Link className="btn btn-ghost btn-sm" to="/characters">
          <Icon name="back" />
          Characters
        </Link>
        <div className="sheet-header">
          <CharacterToken appearance={s.character.appearance} size={52} />
          <div>
            <h1 data-testid="sheet-name">{s.character.name}</h1>
            <span className="rep-badge">
              Reputation <strong data-testid="reputation">{s.reputation}</strong>
            </span>
            {s.origin && (
              <span className="field-hint" data-testid="sheet-origin">
                {' '}
                {s.origin.name} · speaks {s.origin.language}
              </span>
            )}
          </div>
        </div>
        <span className="spacer" />
        <button
          className="btn btn-primary"
          onClick={() => {
            select(s.character.id);
            navigate('/home');
          }}
        >
          Play
        </button>
      </header>

      <main className="screen-body">
        <div className="contain stack">
          <FormError
            error={equip.error ?? unequip.error ?? allocate.error ?? read.error ?? setOrigin.error}
          />
          {read.data && !read.isPending && (
            <p
              className={read.data.success ? 'notice' : 'notice field-error'}
              role="status"
              data-testid="read-result"
            >
              {read.data.message}
            </p>
          )}
          {!s.origin && (
            <OriginPanel
              busy={setOrigin.isPending}
              onSave={(origin) => setOrigin.mutate({ origin })}
            />
          )}

          <div className="sheet-grid">
            <section className="panel area-hero hero" data-testid="equipment">
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
                    size={260}
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

            <section className="panel area-attrs">
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
            </section>

            <section className="panel area-stats">
              <div className="panel-title">
                <span>Combat stats</span>
              </div>
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

            <section className="panel area-inv" id="inventory">
              <div className="panel-title">
                <span>Inventory ({s.inventory.length})</span>
              </div>
              {s.inventory.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No unequipped items. Rifts will drop loot.
                </p>
              ) : (
                <ul className="slot-list" data-testid="inventory">
                  {s.inventory.map((item) => {
                    const slot = targetSlot(item, s);
                    if (item.book)
                      return (
                        <li key={item.id}>
                          <div className="item-line">
                            <strong>
                              {item.name}
                              {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                            </strong>
                            <BookInfoLine item={item} />
                          </div>
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={read.isPending || !item.book.readable || reading}
                            title={
                              item.book.reason ??
                              'Reading uses the book, even if you fail. Costs AP (a short time, for now).'
                            }
                            onClick={() => read.mutate(item.id)}
                            aria-label={`Read ${item.name}`}
                          >
                            Read
                          </button>
                        </li>
                      );
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

            <section className="panel area-skills">
              <div className="panel-title">
                <span>Skills ({s.skills.length})</span>
              </div>
              {s.skills.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No skills yet. Skill books drop in Rifts; read them from your inventory. Ranks go
                  1–10, then M1–M9 and P (Perfect).
                </p>
              ) : (
                <ul className="ability-list" data-testid="skills">
                  {s.skills.map((k) => (
                    <li key={k.id}>
                      <div className="row" style={{ gap: '0.5rem' }}>
                        <strong>
                          {k.name} {k.rankLabel}
                        </strong>
                        <span className="field-hint">{k.school}</span>
                        <span className="spacer" />
                        <span className="field-hint">Power {k.power}%</span>
                      </div>
                      <div className="field-hint">
                        {k.nextRankLabel
                          ? `${k.progress} / ${k.needed} books to rank ${k.nextRankLabel}`
                          : 'Perfected'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel area-abil">
              <div className="panel-title">
                <span>Abilities in combat</span>
              </div>
              <ul className="ability-list" data-testid="abilities">
                {s.abilities.map((a) => (
                  <li key={a.id}>
                    <div className="row" style={{ gap: '0.5rem' }}>
                      <strong>
                        {a.name}
                        {a.rank ? ` ${a.rank}` : ''}
                      </strong>
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
        </div>
      </main>
    </Screen>
  );
}
