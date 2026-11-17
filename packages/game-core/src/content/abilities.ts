import type { AbilitySource, Attributes, StatusId } from '@realms/shared';

/*
 * Ability definitions (data). PROVISIONAL CONTENT — names and numbers are
 * placeholders tuned by simulation (see docs/REQUESTS.md).
 *
 * Battlefield (D13): two rows (front/back) of three slots per side. Each
 * ability states what it can hit; "front" = first *occupied* row (A14).
 * Costs: Focus (per-turn energy) and, for spells, Mana.
 * Scaling (D33): each weapon ability scales with two attributes; the effect
 * value is multiplied by 1 + 8% × weighted attribute points.
 */

export type Row = 'front' | 'back';
export type DamageType = 'physical' | 'ranged' | 'magic';

export interface AbilityTargeting {
  side: 'enemy' | 'ally' | 'self';
  rows: Row[];
  area: 'single' | 'row' | 'all';
}

export type AbilityEffect =
  | {
      kind: 'damage';
      damageType: DamageType;
      min: number;
      max: number;
      /** Extra damage against targets with a status (synergies). */
      bonusVs?: { status: StatusId; multiplier: number };
    }
  | { kind: 'heal'; min: number; max: number }
  | { kind: 'block'; min: number; max: number }
  /** value = damage per turn for bleed/burn (scaled), unused for others. */
  | { kind: 'status'; status: StatusId; turns: number; value?: number }
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
  scaling: Partial<Attributes>;
}

const ability = (a: AbilityDef) => a;
const ENEMY_SINGLE_FRONT: AbilityTargeting = { side: 'enemy', rows: ['front'], area: 'single' };
const ENEMY_SINGLE_ANY: AbilityTargeting = {
  side: 'enemy',
  rows: ['front', 'back'],
  area: 'single',
};
const ALLY_ANY: AbilityTargeting = { side: 'ally', rows: ['front', 'back'], area: 'single' };

const SWORD = { might: 0.6, agility: 0.4 };
const AXE = { might: 0.6, vitality: 0.4 };
const DAGGER = { agility: 0.5, precision: 0.5 };
const BOW = { precision: 0.6, agility: 0.4 };
const STAFF = { arcana: 0.7, spirit: 0.3 };
const TOME = { arcana: 0.5, precision: 0.5 };
const SHIELD = { might: 0.5, vitality: 0.5 };
const TALISMAN = { spirit: 1 };

export const ABILITIES = {
  // ---- universal ----
  swap_position: ability({
    id: 'swap_position',
    name: 'Swap Position',
    description:
      'Move to another slot on your side. Swapping with another player costs Focus for both of you.',
    source: 'universal',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'ally', rows: ['front', 'back'], area: 'single' },
    effects: [{ kind: 'swap' }],
    scaling: {},
  }),
  unarmed_strike: ability({
    id: 'unarmed_strike',
    name: 'Unarmed Strike',
    description: 'A desperate punch.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [{ kind: 'damage', damageType: 'physical', min: 2, max: 3 }],
    scaling: { might: 1 },
  }),

  // ---- sword: Might + Agility ----
  slash: ability({
    id: 'slash',
    name: 'Slash',
    description: 'A quick cut at the nearest foe.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [{ kind: 'damage', damageType: 'physical', min: 5, max: 7 }],
    scaling: SWORD,
  }),
  cleave: ability({
    id: 'cleave',
    name: 'Cleave',
    description: 'A wide swing that hits the whole front row.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front'], area: 'row' },
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 5 }],
    scaling: SWORD,
  }),
  rend: ability({
    id: 'rend',
    name: 'Rend',
    description: 'A tearing cut that makes the target bleed.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 2, max: 3 },
      { kind: 'status', status: 'bleed', turns: 2, value: 3 },
    ],
    scaling: SWORD,
  }),

  // ---- axe: Might + Vitality (two-handed) ----
  chop: ability({
    id: 'chop',
    name: 'Chop',
    description: 'A heavy blow.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [{ kind: 'damage', damageType: 'physical', min: 6, max: 9 }],
    scaling: AXE,
  }),
  sunder: ability({
    id: 'sunder',
    name: 'Sunder',
    description: 'Crushes the target, weakening its attacks.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 6, max: 8 },
      { kind: 'status', status: 'weaken', turns: 2 },
    ],
    scaling: AXE,
  }),

  // ---- dagger: Agility + Precision (one-handed, also off-hand) ----
  stab: ability({
    id: 'stab',
    name: 'Stab',
    description: 'A fast thrust.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [{ kind: 'damage', damageType: 'physical', min: 7, max: 9 }],
    scaling: DAGGER,
  }),
  puncture: ability({
    id: 'puncture',
    name: 'Puncture',
    description: 'Opens a wound that bleeds.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 1, max: 2 },
      { kind: 'status', status: 'bleed', turns: 3, value: 4 },
    ],
    scaling: DAGGER,
  }),
  backstab: ability({
    id: 'backstab',
    name: 'Backstab',
    description: 'Reaches any row. Much stronger against bleeding targets.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: ENEMY_SINGLE_ANY,
    effects: [
      {
        kind: 'damage',
        damageType: 'physical',
        min: 8,
        max: 10,
        bonusVs: { status: 'bleed', multiplier: 1.6 },
      },
    ],
    scaling: DAGGER,
  }),

  shadowstep: ability({
    id: 'shadowstep',
    name: 'Shadowstep',
    description: 'Slip out of reach: gain Block until your next turn.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'self', rows: ['front', 'back'], area: 'single' },
    effects: [{ kind: 'block', min: 4, max: 5 }],
    scaling: DAGGER,
  }),

  // ---- bow: Precision + Agility (two-handed) ----
  aimed_shot: ability({
    id: 'aimed_shot',
    name: 'Aimed Shot',
    description: 'A precise arrow at any enemy.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_ANY,
    effects: [{ kind: 'damage', damageType: 'ranged', min: 7, max: 9 }],
    scaling: BOW,
  }),
  volley: ability({
    id: 'volley',
    name: 'Volley',
    description: 'Rain arrows on the enemy back row.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['back'], area: 'row' },
    effects: [{ kind: 'damage', damageType: 'ranged', min: 4, max: 6 }],
    scaling: BOW,
  }),
  marking_shot: ability({
    id: 'marking_shot',
    name: 'Marking Shot',
    description: 'Marks a target: it takes more damage from everyone.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_ANY,
    effects: [
      { kind: 'damage', damageType: 'ranged', min: 3, max: 4 },
      { kind: 'status', status: 'mark', turns: 2 },
    ],
    scaling: BOW,
  }),

  // ---- staff: Arcana + Spirit (two-handed) ----
  staff_strike: ability({
    id: 'staff_strike',
    name: 'Staff Strike',
    description: 'A blunt blow with the staff.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [{ kind: 'damage', damageType: 'physical', min: 2, max: 4 }],
    scaling: STAFF,
  }),
  arcane_bolt: ability({
    id: 'arcane_bolt',
    name: 'Arcane Bolt',
    description: 'A bolt of raw magic at any enemy.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 2,
    targeting: ENEMY_SINGLE_ANY,
    effects: [{ kind: 'damage', damageType: 'magic', min: 5, max: 7 }],
    scaling: STAFF,
  }),
  firebolt: ability({
    id: 'firebolt',
    name: 'Firebolt',
    description: 'Sets the target on fire.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 3,
    targeting: ENEMY_SINGLE_ANY,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 2, max: 3 },
      { kind: 'status', status: 'burn', turns: 2, value: 3 },
    ],
    scaling: STAFF,
  }),
  mend: ability({
    id: 'mend',
    name: 'Mend',
    description: 'Restore health to an ally.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 5,
    targeting: ALLY_ANY,
    effects: [{ kind: 'heal', min: 4, max: 5 }],
    scaling: { spirit: 0.7, arcana: 0.3 },
  }),

  // ---- tome: Arcana + Precision (one-handed) ----
  spark: ability({
    id: 'spark',
    name: 'Spark',
    description: 'A basic spell at any enemy. Costs no mana.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_ANY,
    effects: [{ kind: 'damage', damageType: 'magic', min: 5, max: 6 }],
    scaling: TOME,
  }),
  hex: ability({
    id: 'hex',
    name: 'Hex',
    description: 'Curses a target: marked and weakened.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 2,
    targeting: ENEMY_SINGLE_ANY,
    effects: [
      { kind: 'status', status: 'mark', turns: 2 },
      { kind: 'status', status: 'weaken', turns: 2 },
    ],
    scaling: TOME,
  }),

  // ---- shield (off-hand): Might + Vitality ----
  raise_shield: ability({
    id: 'raise_shield',
    name: 'Raise Shield',
    description: 'Gain Block until your next turn.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'self', rows: ['front', 'back'], area: 'single' },
    effects: [{ kind: 'block', min: 4, max: 5 }],
    scaling: SHIELD,
  }),
  guard_ally: ability({
    id: 'guard_ally',
    name: 'Guard Ally',
    description: 'Give Block to an ally until your next turn.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ALLY_ANY,
    effects: [{ kind: 'block', min: 3, max: 4 }],
    scaling: SHIELD,
  }),

  // ---- talisman (off-hand): Spirit ----
  blessing: ability({
    id: 'blessing',
    name: 'Blessing',
    description: 'A small heal for an ally.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 3,
    targeting: ALLY_ANY,
    effects: [{ kind: 'heal', min: 5, max: 6 }],
    scaling: TALISMAN,
  }),
  ward: ability({
    id: 'ward',
    name: 'Ward',
    description: 'A protective barrier: Block for an ally.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 2,
    targeting: ALLY_ANY,
    effects: [{ kind: 'block', min: 3, max: 4 }],
    scaling: TALISMAN,
  }),

  // ---- enemies (PROVISIONAL); they scale with their own power multiplier ----
  husk_claw: ability({
    id: 'husk_claw',
    name: 'Claw',
    description: 'A clumsy rake at the nearest foe.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 6 }],
    scaling: {},
  }),
  spit_shard: ability({
    id: 'spit_shard',
    name: 'Shard Spit',
    description: 'Spits a crystal shard at any foe.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_SINGLE_ANY,
    effects: [{ kind: 'damage', damageType: 'ranged', min: 3, max: 5 }],
    scaling: {},
  }),
  hound_lunge: ability({
    id: 'hound_lunge',
    name: 'Lunge',
    description: 'A fast bite that makes the target bleed.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: ENEMY_SINGLE_FRONT,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 5, max: 7 },
      { kind: 'status', status: 'bleed', turns: 2, value: 2 },
    ],
    scaling: {},
  }),
  warden_slam: ability({
    id: 'warden_slam',
    name: 'Rift Slam',
    description: 'Shakes the whole front row.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front'], area: 'row' },
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 6 }],
    scaling: {},
  }),
  warden_pulse: ability({
    id: 'warden_pulse',
    name: 'Void Pulse',
    description: 'A wave of rift energy that burns everyone.',
    source: 'enemy',
    focusCost: 3,
    manaCost: 0,
    targeting: { side: 'enemy', rows: ['front', 'back'], area: 'all' },
    effects: [
      { kind: 'damage', damageType: 'magic', min: 3, max: 4 },
      { kind: 'status', status: 'burn', turns: 2, value: 2 },
    ],
    scaling: {},
  }),
  warden_seal: ability({
    id: 'warden_seal',
    name: 'Seal',
    description: 'Locks one foe in place: they lose their next turn.',
    source: 'enemy',
    focusCost: 3,
    manaCost: 0,
    targeting: ENEMY_SINGLE_ANY,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 2, max: 3 },
      { kind: 'status', status: 'stun', turns: 1 },
    ],
    scaling: {},
  }),
} satisfies Record<string, AbilityDef>;

export type AbilityId = keyof typeof ABILITIES;

export function getAbility(id: string): AbilityDef | undefined {
  return (ABILITIES as Record<string, AbilityDef>)[id];
}

export const UNIVERSAL_ABILITIES: AbilityId[] = ['swap_position'];
export const UNARMED_ABILITIES: AbilityId[] = ['unarmed_strike'];

export const STATUS_NAMES: Record<StatusId, string> = {
  bleed: 'Bleed',
  burn: 'Burn',
  mark: 'Marked',
  weaken: 'Weakened',
  stun: 'Stunned',
};

export const STATUS_DESCRIPTIONS: Record<StatusId, string> = {
  bleed: 'Takes damage at the start of each turn (ignores armor).',
  burn: 'Takes damage at the start of each turn (ignores resistance).',
  mark: 'Takes 25% more damage.',
  weaken: 'Deals 25% less damage.',
  stun: 'Loses the next turn.',
};

export function describeTargeting(t: AbilityTargeting): string {
  const who = t.side === 'self' ? 'Self' : t.side === 'ally' ? 'Ally' : 'Enemy';
  if (t.side === 'self') return 'Self';
  const area =
    t.area === 'single'
      ? `One ${who.toLowerCase()}`
      : t.area === 'row'
        ? `${who} row`
        : `All ${who.toLowerCase()}s`;
  const rows = t.rows.length === 2 ? 'any row' : `${t.rows[0]} row`;
  return t.area === 'all' ? area : `${area} · ${rows}`;
}

export function describeEffects(a: AbilityDef): string[] {
  return a.effects.flatMap((e) => {
    switch (e.kind) {
      case 'damage':
        return [
          `${e.min}–${e.max} ${e.damageType} damage` +
            (e.bonusVs
              ? ` (×${e.bonusVs.multiplier} vs ${STATUS_NAMES[e.bonusVs.status].toLowerCase()})`
              : ''),
        ];
      case 'heal':
        return [`Heal ${e.min}–${e.max}`];
      case 'block':
        return [`Block ${e.min}–${e.max}`];
      case 'status':
        return [
          `${STATUS_NAMES[e.status]}${e.value ? ` ${e.value}` : ''} for ${e.turns} turn${e.turns > 1 ? 's' : ''}`,
        ];
      case 'swap':
        return [];
    }
  });
}

export function describeScaling(s: Partial<Attributes>): string {
  const names: Record<string, string> = {
    might: 'Might',
    agility: 'Agility',
    precision: 'Precision',
    vitality: 'Vitality',
    arcana: 'Arcana',
    spirit: 'Spirit',
  };
  return Object.entries(s)
    .map(([k, w]) => `${names[k]} ${Math.round((w ?? 0) * 100)}%`)
    .join(' · ');
}
