import type { RoomType, StatusId } from '@realms/shared';

/*
 * The Rift — room types and exploration rules (request #31). Data only;
 * PROVISIONAL NUMBERS, configurable here.
 */

export interface RoomTypeInfo {
  type: RoomType;
  name: string;
  description: string;
  /** Hidden rooms are not on the map until found. */
  hidden: boolean;
}

export const ROOM_TYPE_INFO: Record<RoomType, RoomTypeInfo> = {
  combat: {
    type: 'combat',
    name: 'Combat',
    description: 'Ordinary enemies. Costs HP and Mana. No drops.',
    hidden: false,
  },
  elite: {
    type: 'elite',
    name: 'Elite',
    description: 'Much stronger enemies. Optional and dangerous. No drops.',
    hidden: false,
  },
  campsite: {
    type: 'campsite',
    name: 'Campsite',
    description: 'Rest: recover part of your HP and Mana and shake off debuffs.',
    hidden: false,
  },
  event: {
    type: 'event',
    name: 'Random Event',
    description: 'A choice with risks and rewards. Tests use BASE attributes only.',
    hidden: false,
  },
  loot: {
    type: 'loot',
    name: 'Loot',
    description: 'Guaranteed rewards for everyone.',
    hidden: false,
  },
  secret: {
    type: 'secret',
    name: 'Secret Room',
    description: 'A hidden chamber with rare rewards.',
    hidden: true,
  },
  boss: {
    type: 'boss',
    name: 'Boss',
    description: 'The guardian of the Rift. Defeat it for the main rewards.',
    hidden: false,
  },
};

export const EXPLORATION_RULES = {
  /** Attribute tests: roll 1..testDie + BASE attribute ≥ difficulty. */
  testDie: 10,
  campsite: {
    /** Share of max HP / Mana recovered (never a full recovery). */
    hpPercent: 30,
    manaPercent: 40,
    removesDebuffs: true,
  },
  /** Passive search for a secret room when entering the room next to it. */
  secretSearch: { attribute: 'precision', difficulty: 14 },
  /** Event HP losses never take a character below this. */
  minHpFromEvents: 1,
  /** Seconds for a group decision (path or event approach), like a combat round (D16). */
  decisionSeconds: 60,
} as const satisfies {
  testDie: number;
  campsite: { hpPercent: number; manaPercent: number; removesDebuffs: boolean };
  secretSearch: { attribute: 'precision'; difficulty: number };
  minHpFromEvents: number;
  decisionSeconds: number;
};

/** Combat effects of a lasting exploration condition, applied at the start of each fight. */
export interface ConditionCombatEffect {
  status?: { status: StatusId; turns: number; value?: number };
  firstRoundFocus?: number;
  firstRoundBlock?: number;
}

export interface ConditionDef {
  id: string;
  name: string;
  description: string;
  kind: 'debuff' | 'boon';
  /** How many rooms it lasts (null = until a Campsite removes it). */
  rooms: number | null;
  combat: ConditionCombatEffect;
}

const condition = (c: ConditionDef) => c;

/** Debuffs and advantages from events that affect later rooms. PROVISIONAL. */
export const CONDITIONS = {
  shaken: condition({
    id: 'shaken',
    name: 'Shaken',
    description: 'Weakened for the first 2 rounds of every fight, until you rest.',
    kind: 'debuff',
    rooms: null,
    combat: { status: { status: 'weaken', turns: 2 } },
  }),
  cursed: condition({
    id: 'cursed',
    name: 'Cursed',
    description: 'Marked for the first 2 rounds of every fight (3 rooms).',
    kind: 'debuff',
    rooms: 3,
    combat: { status: { status: 'mark', turns: 2 } },
  }),
  poisoned: condition({
    id: 'poisoned',
    name: 'Poisoned',
    description: 'Bleeds 3 per round for the first 3 rounds of every fight (2 rooms).',
    kind: 'debuff',
    rooms: 2,
    combat: { status: { status: 'bleed', turns: 3, value: 3 } },
  }),
  exhausted: condition({
    id: 'exhausted',
    name: 'Exhausted',
    description: '1 less Focus in the first round of every fight, until you rest.',
    kind: 'debuff',
    rooms: null,
    combat: { firstRoundFocus: -1 },
  }),
  inspired: condition({
    id: 'inspired',
    name: 'Inspired',
    description: '+1 Focus in the first round of every fight (2 rooms).',
    kind: 'boon',
    rooms: 2,
    combat: { firstRoundFocus: 1 },
  }),
  warded: condition({
    id: 'warded',
    name: 'Warded',
    description: 'Start every fight with 6 Block (2 rooms).',
    kind: 'boon',
    rooms: 2,
    combat: { firstRoundBlock: 6 },
  }),
} satisfies Record<string, ConditionDef>;

export type ConditionId = keyof typeof CONDITIONS;

export function getCondition(id: string): ConditionDef | undefined {
  return (CONDITIONS as Record<string, ConditionDef>)[id];
}
