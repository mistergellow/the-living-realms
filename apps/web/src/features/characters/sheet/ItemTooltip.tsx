import { ATTRIBUTE_NAMES } from '@realms/game-core';
import type { AttributeKey, EquipSlot, ItemDto } from '@realms/shared';
import { SLOT_LABELS } from './slots';

const KIND_LABEL: Record<ItemDto['kind'], string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  armor: 'Armor',
  accessory: 'Accessory',
  material: 'Material',
  consumable: 'Consumable',
};

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function slotsText(slots: EquipSlot[]): string {
  const names = [...new Set(slots.map((s) => SLOT_LABELS[s]))];
  return names.join(' or ');
}

/** Everything about an item, for the hover tooltip (request #39). */
export function ItemTooltipBody({ item }: { item: ItemDto }) {
  const w = item.weapon;
  const bonuses = Object.entries(item.bonuses).filter(([, v]) => v);
  const tone =
    item.quality <= 0 ? 'var(--danger)' : item.quality <= 25 ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="item-tip" data-testid="item-tooltip">
      <header>
        <strong className="tip-name" data-kind={item.kind}>
          {item.name}
          {item.quantity > 1 && <span className="muted"> ×{item.quantity}</span>}
        </strong>
        <span className="tip-sub">
          {w
            ? `${w.typeName} · ${w.hands === 2 ? 'Two-handed' : 'One-handed'}`
            : KIND_LABEL[item.kind]}
          {item.slots.length > 0 && ` · ${slotsText(item.slots)}`}
        </span>
      </header>

      {w && (
        <div className="tip-block">
          <div className="tip-big">
            {w.baseDamage.min}–{w.baseDamage.max} <span>{w.attackType} damage</span>
          </div>
          <div className="tip-row">
            <span>Basic attack</span>
            <b>{w.basicAttackCost} Focus</b>
          </div>
          <div className="tip-row">
            <span>Scales with</span>
            <b>
              {ATTRIBUTE_NAMES[w.primaryAttribute]}
              {w.secondaryAttribute && ` · ${ATTRIBUTE_NAMES[w.secondaryAttribute]}`}
            </b>
          </div>
          <p className="tip-identity">
            {w.attackStyle} · {w.identity}
          </p>
        </div>
      )}

      {(item.armor > 0 || item.magicResist > 0 || bonuses.length > 0) && (
        <ul className="tip-stats">
          {item.armor > 0 && <li>+{item.armor} Armor</li>}
          {item.magicResist > 0 && <li>+{item.magicResist} Magic resist</li>}
          {bonuses.map(([k, v]) => (
            <li key={k}>
              {fmt(v ?? 0)} {ATTRIBUTE_NAMES[k as AttributeKey]}
            </li>
          ))}
        </ul>
      )}

      {item.grantsAbilities.length > 0 && (
        <div className="tip-block">
          <span className="tip-label">Grants</span>
          <div className="tip-chips">
            {item.grantsAbilities.map((a) => (
              <span key={a} className="tip-chip">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {w && (
        <div className="tip-row muted">
          <span>
            Upgrade +{w.upgradeLevel} · specials {w.specials.length}/{w.maxSpecials}
          </span>
          <span>
            runes {w.runeSlots.filter((r) => r.unlocked).length}/{w.runeSlots.length}
          </span>
        </div>
      )}

      {item.description && <p className="tip-desc">{item.description}</p>}

      {item.slots.length > 0 && (
        <div className="tip-quality">
          <span>Quality</span>
          <span className="quality">
            <span style={{ width: `${item.quality}%`, background: tone }} />
          </span>
          <b style={{ color: tone }}>{item.broken ? 'Broken' : `${item.quality}/100`}</b>
        </div>
      )}
      {item.broken && <p className="tip-warn">Broken: cannot be equipped until repaired.</p>}
    </div>
  );
}
