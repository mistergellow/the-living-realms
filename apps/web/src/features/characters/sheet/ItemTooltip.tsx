import {
  getAbility,
  getWeaponType,
  scalingMultiplier,
  WEAPON_TYPES,
  weaponScaling,
  AFFIX_RULES,
  ARMOR_CLASS_NAMES,
  ATTRIBUTE_NAMES,
  getItemDef,
  getSkill,
  RARITY_NAMES,
} from '@realms/game-core';
import { Rich } from '../../../shared/ui/Rich';
import { AbilityEffects } from '../../../shared/ui/EffectIcon';
import type { AttributeKey, EquipSlot, ItemDto } from '@realms/shared';
import { SLOT_LABELS } from './slots';
import { useActiveCharacter } from '../active-character';
import { useCharacterSheet } from '../api';
import { AbilityIcon } from '../../rifts/AbilityIcon';

const DAMAGE_TYPE_NAMES: Record<string, string> = {
  physical: 'Physical',
  magic: 'Magic',
  // Request #65: ranged weapons deal physical damage.
  ranged: 'Physical',
};

const KIND_LABEL: Record<ItemDto['kind'], string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  armor: 'Armor',
  accessory: 'Accessory',
  material: 'Material',
  consumable: 'Consumable',
  tool: 'Tool',
};

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function slotsText(slots: EquipSlot[]): string {
  const names = [...new Set(slots.map((s) => SLOT_LABELS[s]))];
  return names.join(' or ');
}

/**
 * Everything about an item, for the hover tooltip (request #39), with the item
 * card's parts (request #37): name coloured by rarity (= number of bonus
 * effects), BASE-attribute requirements, bonus effects and rune slots.
 */
export function ItemTooltipBody({ item }: { item: ItemDto }) {
  const w = item.weapon;
  // Request #65: your own damage with this weapon (your total attributes).
  const characterId = useActiveCharacter((s) => s.characterId);
  const sheet = useCharacterSheet(characterId);
  const def = getItemDef(item.defId);
  const type = def?.weaponType ? getWeaponType(def.weaponType) : undefined;
  const yours =
    w && sheet.data && type && WEAPON_TYPES[type.type as keyof typeof WEAPON_TYPES]
      ? (() => {
          const m = scalingMultiplier(
            sheet.data.attributes,
            weaponScaling(type.type as Parameters<typeof weaponScaling>[0]),
          );
          return {
            min: Math.floor(w.baseDamage.min * m),
            max: Math.floor(w.baseDamage.max * m),
          };
        })()
      : null;
  const abilityIds = def?.abilities ?? [];
  const bonuses = Object.entries(item.bonuses).filter(([, v]) => v);
  const tone =
    item.quality <= 0 ? 'var(--danger)' : item.quality <= 25 ? 'var(--warning)' : 'var(--success)';
  return (
    <div
      className="item-tip"
      data-testid="item-tooltip"
      data-rarity={item.rarity}
      data-named={item.named ? true : undefined}
    >
      <header>
        <strong className="tip-name rarity-text" data-kind={item.kind}>
          {item.name}
          {item.quantity > 1 && <span className="muted"> ×{item.quantity}</span>}
        </strong>
        <span className="tip-sub">
          {w
            ? `${w.typeName} · ${w.hands === 2 ? 'Two-handed' : 'One-handed'}`
            : KIND_LABEL[item.kind]}
          {item.armorClass && ` · ${ARMOR_CLASS_NAMES[item.armorClass]}`}
          {item.slots.length > 0 && ` · ${slotsText(item.slots)}`}
        </span>
        {item.named && (
          <span className="tip-named" data-testid="item-named">
            Named · {item.named.baseName}
          </span>
        )}
        {item.slots.length > 0 && (
          <span className="tip-rarity rarity-text">{RARITY_NAMES[item.rarity]}</span>
        )}
      </header>

      {w && (
        // Request #65: the weapon's own damage, and what it does in your hands.
        <div className="tip-block" data-testid="weapon-damage">
          <div className="tip-row">
            <span>Damage type</span>
            <b className={`kw kw-${w.attackType === 'magic' ? 'magic' : 'physical'}`}>
              {DAMAGE_TYPE_NAMES[w.attackType]}
              {w.attackType === 'ranged' ? ' · ranged attack' : ''}
            </b>
          </div>
          <div className="tip-row">
            <span>Base damage</span>
            <b className="v">
              {w.baseDamage.min}–{w.baseDamage.max}
            </b>
          </div>
          {yours && (
            <div className="tip-row" data-testid="your-damage">
              <span>With your attributes</span>
              <b className="v tip-yours">
                {yours.min}–{yours.max}
              </b>
            </div>
          )}
          <div className="tip-row">
            <span>Scales with</span>
            <b>
              <Rich
                text={`${ATTRIBUTE_NAMES[w.primaryAttribute]}${w.secondaryAttribute ? ` · ${ATTRIBUTE_NAMES[w.secondaryAttribute]}` : ''}`}
              />
            </b>
          </div>
          <div className="tip-row">
            <span>Basic attack</span>
            <b>
              <Rich text={`${w.basicAttackCost} Focus`} />
            </b>
          </div>
          {w.upgradeLevel > 0 && (
            <div className="tip-row">
              <span>Upgrade</span>
              <b className="v">+{w.upgradeLevel}</b>
            </div>
          )}
        </div>
      )}

      {item.grade && (
        <div className="tip-row" data-testid="item-grade">
          <span>Quality</span>
          <b className="grade-text" data-grade={item.grade.value}>
            {item.grade.name}
          </b>
        </div>
      )}

      {item.tool && (
        <div className="tip-block" data-testid="tool-info">
          <div className="tip-row">
            <span>Tool</span>
            <b>
              {item.tool.typeName} · tier {item.tool.tier}
            </b>
          </div>
          {item.tool.minRank > 0 && (
            <div className="tip-row">
              <span>Needs Mastery</span>
              <b>{item.tool.rankName}</b>
            </div>
          )}
          <p className="tip-identity">
            Keep it in your bag to use it. It does not replace Mastery.
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

      {item.requirements.length > 0 && (
        <div className="tip-block">
          <span className="tip-label">Requires</span>
          {item.requirements.map((r) => (
            <div key={r.attribute} className="tip-row" data-met={r.met}>
              <span>{ATTRIBUTE_NAMES[r.attribute]}</span>
              <b>{r.value}</b>
            </div>
          ))}
        </div>
      )}

      {item.named && item.named.effects.length > 0 && (
        <div className="tip-block">
          <span className="tip-label">Named effects (grow with upgrades)</span>
          <ul className="tip-affixes" data-testid="named-effects">
            {item.named.effects.map((a) => (
              <li key={a.id}>
                <span>
                  <Rich text={a.label} />
                </span>
                <b>{a.display}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.affixes.length > 0 && (
        <div className="tip-block">
          <span className="tip-label">
            Bonus effects [{item.affixes.length}/{AFFIX_RULES.maxAffixes}]
          </span>
          <ul className="tip-affixes" data-testid="item-affixes">
            {item.affixes.map((a) => (
              <li key={a.id}>
                <span>
                  <Rich text={a.label.replace(/\s[+−-]?\d+%?$/, '')} />
                </span>
                <b>{a.display}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.runeSlots && (
        <div className="tip-row muted">
          <span>Rune slots</span>
          <span>
            {item.runeSlots.used}/{item.runeSlots.total}
          </span>
        </div>
      )}

      {(() => {
        // Skill Books (request #47): what it teaches, its effects and requirements.
        const skillId = getItemDef(item.defId)?.teaches;
        const sk = skillId ? getSkill(skillId) : undefined;
        if (!sk) return null;
        return (
          <div className="tip-block" data-testid="book-skill">
            <span className="tip-label">Teaches {sk.name}</span>
            <AbilityEffects abilityId={sk.id} />
            <span className="muted">
              {sk.focusCost} Focus{sk.manaCost ? ` + ${sk.manaCost} Mana` : ''}
            </span>
            {Object.entries(sk.requirements ?? {}).map(([k, v]) => (
              <div key={k} className="tip-row">
                <span>Requires {ATTRIBUTE_NAMES[k as AttributeKey]}</span>
                <b>{v}</b>
              </div>
            ))}
            {(() => {
              const known = sheet.data?.learnedSkills.find((x) => x.id === sk.id);
              if (!known)
                return <p className="tip-identity">Double-click to read it and learn the skill.</p>;
              if (!known.nextLevel)
                return <p className="tip-identity">You know it at its highest level (P).</p>;
              return (
                <p className="tip-identity" data-testid="book-next-level">
                  <Rich
                    text={`You know it at Lv ${known.levelLabel}. Lv ${known.nextLevel.label} takes ${known.nextLevel.books} books at once (${known.nextLevel.chance}% chance; on failure the books are lost). Double-click to read.`}
                  />
                </p>
              );
            })()}
          </div>
        );
      })()}

      {abilityIds.length > 0 && (
        <div className="tip-block">
          <span className="tip-label">Abilities while equipped</span>
          <div className="tip-abilities" data-testid="item-abilities">
            {abilityIds.map((id) => (
              <span key={id} className="tip-ability">
                <span className="tip-ability-icon">
                  <AbilityIcon abilityId={id} />
                </span>
                <span>{getAbility(id)?.name ?? id}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {w && w.runeSlots.some((r) => r.unlocked) && (
        <div className="tip-row">
          <span>Rune slots</span>
          <b>
            {w.runeSlots.filter((r) => r.runeId).length}/
            {w.runeSlots.filter((r) => r.unlocked).length}
          </b>
        </div>
      )}

      {/* Base weapons' descriptions only repeat the card; named items keep their story. */}
      {item.description && (!w || item.named) && (
        <p className="tip-desc">
          <Rich text={item.description} />
        </p>
      )}

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
