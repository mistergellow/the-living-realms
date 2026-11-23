import type { Combatant } from '../combat/state.js';
import type { GearCombatEffects } from '@realms/shared';

/*
 * Champions (request #71, PROVISIONAL A135): any ordinary enemy may turn up as
 * a Champion with one or two visible affixes that change how you must fight
 * it. Most reuse the gear effects players have (life steal, reflect, on-hit
 * statuses…), so the combat engine treats them like any other unit.
 */

export interface ChampionAffixDef {
  id: string;
  /** Adjective put before the enemy's name ("Vampiric Rift Husk"). */
  name: string;
  /** What it does, shown to players. */
  description: string;
}

export const CHAMPION_AFFIXES = {
  vampiric: {
    id: 'vampiric',
    name: 'Vampiric',
    description: 'Heals for 40% of the damage it deals.',
  },
  armored: { id: 'armored', name: 'Armored', description: '+25 Armor and Magic Resist.' },
  enraged: { id: 'enraged', name: 'Enraged', description: 'Hits 3 harder (Strength 3).' },
  thorned: { id: 'thorned', name: 'Thorned', description: 'Whoever hits it takes 4 damage.' },
  regenerating: {
    id: 'regenerating',
    name: 'Regenerating',
    description: 'Regains 8% of its health every round.',
  },
  swift: { id: 'swift', name: 'Swift', description: '+1 Focus every round: acts more often.' },
  giant: { id: 'giant', name: 'Giant', description: '+60% health.' },
  mirrored: {
    id: 'mirrored',
    name: 'Mirrored',
    description: '35% chance to send a melee hit back at the attacker.',
  },
  venomous: { id: 'venomous', name: 'Venomous', description: 'Its hits often make you Bleed.' },
  unyielding: {
    id: 'unyielding',
    name: 'Unyielding',
    description: '50% chance to shrug off Stun, Weaken, Mark, Chill and Blind.',
  },
} as const satisfies Record<string, ChampionAffixDef>;

export type ChampionAffixId = keyof typeof CHAMPION_AFFIXES;
export const CHAMPION_AFFIX_IDS = Object.keys(CHAMPION_AFFIXES) as ChampionAffixId[];

/**
 * How often Champions appear, per Rift tier (PROVISIONAL A135): the chance for
 * each ordinary enemy, how many affixes it gets, and whether Elite rooms are
 * always led by Champions.
 */
export const CHAMPION_RULES = {
  chanceByTier: [10, 20, 30, 40, 50],
  affixesByTier: [1, 1, 2, 2, 3],
  eliteAlwaysFromTier: 2,
} as const;

export function championRulesForTier(tier = 1): {
  chance: number;
  affixes: number;
  elite: boolean;
} {
  const i = Math.max(1, Math.min(5, tier)) - 1;
  return {
    chance: CHAMPION_RULES.chanceByTier[i]!,
    affixes: CHAMPION_RULES.affixesByTier[i]!,
    elite: tier >= CHAMPION_RULES.eliteAlwaysFromTier,
  };
}

const emptyGear = (): GearCombatEffects => ({
  damagePct: 0,
  bossDamagePct: 0,
  lifestealPct: 0,
  thorns: 0,
  onHit: [],
});

/** Turns an enemy into a Champion with these affixes (mutates the unit). */
export function makeChampion(
  unit: Combatant,
  affixes: ChampionAffixId[],
  opts: { innate?: boolean } = {},
): void {
  if (!affixes.length) return;
  const gear = unit.gear ?? emptyGear();
  const forever = 99;
  for (const id of affixes) {
    switch (id) {
      case 'vampiric':
        gear.lifestealPct += 40;
        break;
      case 'armored':
        unit.stats = {
          ...unit.stats,
          armor: unit.stats.armor + 25,
          magicResist: unit.stats.magicResist + 25,
        };
        break;
      case 'enraged':
        unit.statuses.push({ id: 'strength', value: 3, turns: forever });
        break;
      case 'thorned':
        gear.thorns += 4;
        break;
      case 'regenerating':
        unit.statuses.push({
          id: 'regen',
          value: Math.max(1, Math.round(unit.maxHp * 0.08)),
          turns: forever,
        });
        break;
      case 'swift':
        unit.focusPerRound += 1;
        unit.stats = {
          ...unit.stats,
          focusPerRound: unit.stats.focusPerRound + 1,
          initiative: unit.stats.initiative + 4,
        };
        break;
      case 'giant':
        unit.maxHp = Math.round(unit.maxHp * 1.6);
        unit.hp = unit.maxHp;
        unit.stats = { ...unit.stats, maxHp: unit.maxHp };
        break;
      case 'mirrored':
        gear.reflectChance = (gear.reflectChance ?? 0) + 35;
        break;
      case 'venomous':
        gear.onHit.push({ status: 'bleed', chance: 60 });
        break;
      case 'unyielding':
        gear.statusResist = { stun: 50, weaken: 50, mark: 50, chill: 50, blind: 50 };
        break;
    }
  }
  unit.gear = gear;
  // Innate traits (part of what the enemy is) are not shown as Champion affixes.
  if (opts.innate) return;
  unit.affixes = [...(unit.affixes ?? []), ...affixes];
  unit.name = `${CHAMPION_AFFIXES[affixes[0]!].name} ${unit.name}`;
}
