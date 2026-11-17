import type { AbilitySource } from '@realms/shared';

/*
 * Ability definitions (data). PROVISIONAL CONTENT for the first playable
 * Rift — names and numbers are placeholders to be tuned with the project owner.
 *
 * Combat model (decisions D13, D24, D27): two rows (front/back) of three slots
 * per side. Each ability states what it can hit; most hit the first row.
 * "front" targeting means the first *occupied* row (if the front row is empty,
 * the back row is exposed). Costs are paid in Focus (per-turn energy) and,
 * for spells, Mana. Executed by the combat engine in milestone M2.
 */

export type Row = 'front' | 'back';
export type DamageType = 'physical' | 'ranged' | 'magic';

export interface AbilityTargeting {
  side: 'enemy' | 'ally' | 'self';
  /** Rows that can be targeted. */
  rows: Row[];
  /** One target, every unit in one row, or every unit on that side. */
  area: 'single' | 'row' | 'all';
}

export type AbilityEffect =
  | { kind: 'damage'; damageType: DamageType; base: number }
  | { kind: 'heal'; base: number }
  | { kind: 'swap' };

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  source: AbilitySource;
  focusCost: number;
  manaCost: number;
  targeting: AbilityTargeting;
  effects: AbilityEffect[];
}

const ability = (a: AbilityDef) => a;

export const ABILITIES = {
  // ---- universal ----
  swap_position: ability({
    id: 'swap_position',
    name: 'Swap Position',
    description:
      'Swap places with an adjacent ally or an empty slot. Swapping with an ally costs Focus for both.',
    source: 'universal',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'ally', rows: ['front', 'back'], area: 'single' },
    effects: [{ kind: 'swap' }],
  }),
  unarmed_strike: ability({
    id: 'unarmed_strike',
    name: 'Unarmed Strike',
    description: 'A desperate punch.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front'], area: 'single' },
    effects: [{ kind: 'damage', damageType: 'physical', base: 2 }],
  }),

  // ---- sword ----
  slash: ability({
    id: 'slash',
    name: 'Slash',
    description: 'A quick cut at the nearest foe.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front'], area: 'single' },
    effects: [{ kind: 'damage', damageType: 'physical', base: 6 }],
  }),
  cleave: ability({
    id: 'cleave',
    name: 'Cleave',
    description: 'A wide swing that hits the whole front row.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front'], area: 'row' },
    effects: [{ kind: 'damage', damageType: 'physical', base: 4 }],
  }),

  // ---- bow ----
  aimed_shot: ability({
    id: 'aimed_shot',
    name: 'Aimed Shot',
    description: 'A precise arrow at any enemy.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front', 'back'], area: 'single' },
    effects: [{ kind: 'damage', damageType: 'ranged', base: 5 }],
  }),
  volley: ability({
    id: 'volley',
    name: 'Volley',
    description: 'Rain arrows on the enemy back row.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['back'], area: 'row' },
    effects: [{ kind: 'damage', damageType: 'ranged', base: 3 }],
  }),

  // ---- staff ----
  staff_strike: ability({
    id: 'staff_strike',
    name: 'Staff Strike',
    description: 'A blunt blow with the staff.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front'], area: 'single' },
    effects: [{ kind: 'damage', damageType: 'physical', base: 3 }],
  }),
  arcane_bolt: ability({
    id: 'arcane_bolt',
    name: 'Arcane Bolt',
    description: 'A bolt of raw magic at any enemy.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 4,
    targeting: { side: 'enemy', rows: ['front', 'back'], area: 'single' },
    effects: [{ kind: 'damage', damageType: 'magic', base: 7 }],
  }),
  mend: ability({
    id: 'mend',
    name: 'Mend',
    description: 'Restore health to an ally.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 5,
    targeting: { side: 'ally', rows: ['front', 'back'], area: 'single' },
    effects: [{ kind: 'heal', base: 6 }],
  }),
} satisfies Record<string, AbilityDef>;

export type AbilityId = keyof typeof ABILITIES;

export function getAbility(id: string): AbilityDef | undefined {
  return (ABILITIES as Record<string, AbilityDef>)[id];
}

/** Abilities every character has, regardless of equipment. */
export const UNIVERSAL_ABILITIES: AbilityId[] = ['swap_position'];
/** Granted when no usable weapon is equipped. */
export const UNARMED_ABILITIES: AbilityId[] = ['unarmed_strike'];

export function describeTargeting(t: AbilityTargeting): string {
  const who = t.side === 'self' ? 'Self' : t.side === 'ally' ? 'Ally' : 'Enemy';
  const area =
    t.area === 'single'
      ? `One ${who.toLowerCase()}`
      : t.area === 'row'
        ? `${who} row`
        : `All ${who.toLowerCase()}s`;
  const rows = t.rows.length === 2 ? 'any row' : `${t.rows[0]} row`;
  return t.area === 'all' ? area : `${area} · ${rows}`;
}
