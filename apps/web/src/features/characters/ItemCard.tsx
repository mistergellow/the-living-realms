import { AFFIX_RULES, ATTRIBUTE_NAMES, RARITY_NAMES } from '@realms/game-core';
import type { AttributeKey, ItemDto, ItemKind } from '@realms/shared';
import type { ReactNode } from 'react';

/*
 * Item card (request #37), modelled on the owner's reference:
 * header coloured by rarity (= number of bonus effects) with name, type and
 * the base effect; requirements (BASE attributes); bonus effects (up to 5);
 * rune slots only when the item has unlocked ones.
 */

const KIND_LABEL: Record<ItemKind, string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  armor: 'Armor',
  accessory: 'Accessory',
  material: 'Material',
  consumable: 'Consumable',
};

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** The big number in the header: damage for weapons, armor for armour. */
function baseEffect(item: ItemDto): { label: string; value: string } | null {
  if (item.weapon)
    return {
      label: `${item.weapon.attackType === 'magic' ? 'Magic' : 'Physical'} damage`,
      value: `${item.weapon.baseDamage.min}–${item.weapon.baseDamage.max}`,
    };
  if (item.armor) return { label: 'Armor', value: String(item.armor) };
  if (item.magicResist) return { label: 'Magic resist', value: String(item.magicResist) };
  return null;
}

/** Fixed properties of the item type (not the rolled bonus effects). */
function baseLines(item: ItemDto): string[] {
  const shown = baseEffect(item)?.label;
  return [
    item.armor && shown !== 'Armor' ? `Armor +${item.armor}` : null,
    item.magicResist && shown !== 'Magic resist' ? `Magic resist +${item.magicResist}` : null,
    ...Object.entries(item.bonuses).map(
      ([k, v]) => `${ATTRIBUTE_NAMES[k as AttributeKey]} ${signed(v ?? 0)}`,
    ),
    item.weapon
      ? `Basic attack: ${item.weapon.basicAttackCost} Focus · ${item.weapon.hands === 2 ? 'Two-handed' : 'One-handed'}`
      : null,
  ].filter((x): x is string => !!x);
}

export function ItemCard(props: { item: ItemDto; actions?: ReactNode }) {
  const { item } = props;
  const effect = baseEffect(item);
  const lines = baseLines(item);
  const upgrade = item.weapon?.upgradeLevel ?? 0;
  const title = item.name.replace(/ \+\d+$/, '');
  return (
    <article
      className="item-card"
      data-rarity={item.rarity}
      data-broken={item.broken}
      data-testid="item-card"
    >
      <header className="item-card-head">
        <div className="item-card-title">
          {upgrade > 0 && <span className="item-card-upgrade">+{upgrade}</span>}
          <h3>
            {title}
            {item.quantity > 1 ? ` ×${item.quantity}` : ''}
          </h3>
        </div>
        <div className="item-card-tags">
          <span className="item-card-kind">
            {KIND_LABEL[item.kind]}
            {item.weapon ? ` · ${item.weapon.typeName}` : ''}
          </span>
          <span className="item-card-rarity">{RARITY_NAMES[item.rarity]}</span>
        </div>
        {effect && (
          <div className="item-card-base">
            <span>{effect.label}</span>
            <strong>{effect.value}</strong>
          </div>
        )}
      </header>

      {lines.length > 0 && (
        <ul className="item-card-lines">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}

      {item.requirements.length > 0 && (
        <section className="item-card-section">
          <h4>Requires</h4>
          <ul className="item-card-lines">
            {item.requirements.map((r) => (
              <li key={r.attribute} data-met={r.met}>
                <span>{ATTRIBUTE_NAMES[r.attribute]}</span>
                <span>{r.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.affixes.length > 0 && (
        <section className="item-card-section">
          <h4>
            Bonus effects [{item.affixes.length}/{AFFIX_RULES.maxAffixes}]
          </h4>
          <ul className="item-card-lines item-card-affixes" data-testid="item-affixes">
            {item.affixes.map((a) => (
              <li key={a.id} data-group={a.group}>
                <span>{a.label}</span>
                <span>{a.display}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.runeSlots && (
        <section className="item-card-section">
          <h4>
            Rune slots [{item.runeSlots.used}/{item.runeSlots.total}]
          </h4>
        </section>
      )}

      <footer className="item-card-foot">
        <span className="field-hint">{item.description}</span>
        {item.kind !== 'material' && item.kind !== 'consumable' && (
          <span className="item-card-quality">
            {item.broken ? (
              <span className="field-error">Broken</span>
            ) : (
              `Quality ${item.quality}/100`
            )}
          </span>
        )}
        {props.actions}
      </footer>
    </article>
  );
}
