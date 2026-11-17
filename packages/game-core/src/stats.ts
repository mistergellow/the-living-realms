import type { Attributes, DerivedStatsDto } from '@realms/shared';
import { addAttributes, attributeModifier } from './attributes.js';
import { activeEquipment, type OwnedItem } from './equipment.js';

/*
 * Derived combat statistics (decision D22). FORMULAS ARE PROVISIONAL and
 * centralised here so they can be tuned in one place.
 *
 *   STR → physical power        DEX → initiative, ranged power, dodge, crit
 *   CON → max HP, defense        INT → max mana, spell power
 *   WIS → healing, resistance, mana regen    CHA → influence (buffs/debuffs)
 */
export const STAT_RULES = {
  hpBase: 20,
  hpPerCon: 2,
  manaBase: 10,
  manaPerInt: 2,
  dodgeBase: 5,
  dodgePerDexMod: 2,
  critBase: 5,
  critPerDexMod: 2,
  maxChance: 75,
} as const;

const clampChance = (v: number) => Math.max(0, Math.min(STAT_RULES.maxChance, v));

export interface CharacterStats {
  attributes: Attributes;
  stats: DerivedStatsDto;
}

export function computeStats(base: Attributes, items: OwnedItem[] = []): CharacterStats {
  const equipped = activeEquipment(items);
  const attributes = addAttributes(base, ...equipped.map((i) => i.def.bonuses ?? {}));
  const mod = (k: keyof Attributes) => attributeModifier(attributes[k]);
  const armor = equipped.reduce((sum, i) => sum + (i.def.defense ?? 0), 0);

  return {
    attributes,
    stats: {
      maxHp: STAT_RULES.hpBase + STAT_RULES.hpPerCon * attributes.con,
      maxMana: STAT_RULES.manaBase + STAT_RULES.manaPerInt * attributes.int,
      defense: Math.max(0, armor + mod('con')),
      initiative: mod('dex'),
      dodgeChance: clampChance(STAT_RULES.dodgeBase + STAT_RULES.dodgePerDexMod * mod('dex')),
      critChance: clampChance(STAT_RULES.critBase + STAT_RULES.critPerDexMod * mod('dex')),
      physicalPower: mod('str'),
      rangedPower: mod('dex'),
      spellPower: mod('int'),
      healingPower: mod('wis'),
      resistance: mod('wis'),
      manaRegen: Math.max(0, mod('wis')),
      influence: mod('cha'),
    },
  };
}
