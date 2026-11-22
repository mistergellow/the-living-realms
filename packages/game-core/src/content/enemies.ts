import type { EnemyFamily, StatusId } from '@realms/shared';
import type { AbilityId } from './abilities.js';

/*
 * Enemy definitions (data). PROVISIONAL CONTENT: neutral placeholder names
 * and numbers, tuned by simulation. `power` multiplies all ability values.
 */

export interface EnemyDef {
  id: string;
  name: string;
  /** Request #64 (D121): for "strong against {family}" gear bonuses. */
  family: EnemyFamily;
  maxHp: number;
  armor: number;
  magicResist: number;
  /** Agility-like value added to the initiative roll. */
  initiative: number;
  /** Precision: Focus per round, same rule as players (default 5 → 3 Focus). */
  precision?: number;
  critChance: number;
  power: number;
  abilities: AbilityId[];
  isBoss?: boolean;
  /** Statuses it starts every fight with (e.g. Thorns), request #44. */
  startStatuses?: Array<{ id: StatusId; value: number }>;
  /** One line on its mechanic, shown to players (request #44). */
  mechanic?: string;
}

const enemy = (e: EnemyDef) => e;

export const ENEMIES = {
  rift_husk: enemy({
    id: 'rift_husk',
    name: 'Rift Husk',
    family: 'hollow',
    maxHp: 30,
    armor: 8,
    magicResist: 0,
    initiative: 3,
    critChance: 5,
    power: 1.15,
    abilities: ['husk_claw'],
  }),
  shard_spitter: enemy({
    id: 'shard_spitter',
    name: 'Shard Spitter',
    family: 'void',
    maxHp: 20,
    armor: 0,
    magicResist: 10,
    initiative: 7,
    critChance: 5,
    power: 1.15,
    abilities: ['spit_shard'],
  }),
  hollow_hound: enemy({
    id: 'hollow_hound',
    name: 'Hollow Hound',
    family: 'beast',
    maxHp: 26,
    armor: 4,
    magicResist: 4,
    initiative: 9,
    critChance: 10,
    power: 1.1,
    abilities: ['hound_lunge'],
  }),
  rift_bulwark: enemy({
    id: 'rift_bulwark',
    name: 'Rift Bulwark',
    family: 'construct',
    maxHp: 30,
    armor: 20,
    magicResist: 5,
    initiative: 1,
    critChance: 0,
    power: 1,
    abilities: ['bulwark_wall', 'bulwark_bash'],
  }),
  rift_warden: enemy({
    id: 'rift_warden',
    name: 'Rift Warden',
    family: 'construct',
    maxHp: 130,
    armor: 10,
    magicResist: 15,
    initiative: 5,
    critChance: 5,
    power: 1.2,
    precision: 7,
    abilities: ['warden_slam', 'warden_pulse', 'warden_seal'],
    isBoss: true,
  }),
  // ---- request #44: enemies with their own mechanics (PROVISIONAL numbers) ----
  rift_leech: enemy({
    id: 'rift_leech',
    name: 'Rift Leech',
    family: 'beast',
    maxHp: 26,
    armor: 4,
    magicResist: 4,
    initiative: 5,
    critChance: 5,
    power: 1.15,
    abilities: ['leech_drain'],
    mechanic: 'Heals itself for the damage it deals.',
  }),
  thornback: enemy({
    id: 'thornback',
    name: 'Thornback',
    family: 'beast',
    maxHp: 30,
    armor: 12,
    magicResist: 0,
    initiative: 2,
    critChance: 0,
    power: 1.15,
    abilities: ['thorn_lash'],
    startStatuses: [{ id: 'thorns', value: 3 }],
    mechanic: 'Thorns: whoever hits it takes 3 damage back. Use spells or ranged hits wisely.',
  }),
  void_shaman: enemy({
    id: 'void_shaman',
    name: 'Void Shaman',
    family: 'void',
    maxHp: 20,
    armor: 0,
    magicResist: 12,
    initiative: 6,
    critChance: 0,
    power: 1,
    abilities: ['shaman_empower', 'shaman_mend'],
    mechanic: 'Gives its allies Strength and heals them. Kill it first.',
  }),
  brood_mother: enemy({
    id: 'brood_mother',
    name: 'Brood Mother',
    family: 'brood',
    maxHp: 40,
    armor: 6,
    magicResist: 6,
    initiative: 2,
    critChance: 0,
    power: 1,
    abilities: ['brood_spawn', 'brood_slam'],
    mechanic: 'Calls Volatile Mites into the fight.',
  }),
  volatile_mite: enemy({
    id: 'volatile_mite',
    name: 'Volatile Mite',
    family: 'brood',
    maxHp: 9,
    armor: 0,
    magicResist: 0,
    initiative: 8,
    critChance: 0,
    power: 1,
    precision: 3,
    abilities: ['mite_fuse'],
    mechanic: 'Lights a fuse and explodes 2 rounds later, hurting your whole party.',
  }),
  phase_stalker: enemy({
    id: 'phase_stalker',
    name: 'Phase Stalker',
    family: 'void',
    maxHp: 26,
    armor: 4,
    magicResist: 4,
    initiative: 9,
    critChance: 10,
    power: 1,
    abilities: ['stalker_phase', 'stalker_strike'],
    mechanic: 'Turns Intangible (every hit deals 1) on some rounds: strike when it is solid.',
  }),
  rift_zealot: enemy({
    id: 'rift_zealot',
    name: 'Rift Zealot',
    family: 'humanoid',
    maxHp: 26,
    armor: 2,
    magicResist: 8,
    initiative: 4,
    critChance: 0,
    power: 1,
    abilities: ['zealot_ritual', 'zealot_strike'],
    mechanic: 'Its ritual makes it stronger every round. End it fast.',
  }),
  /**
   * World boss, season 1 (request #43). Its real HP is the shared pool in the
   * database; maxHp here is only the base the pool is scaled from.
   * PLACEHOLDER: name, theme, numbers.
   */
  hollow_colossus: enemy({
    id: 'hollow_colossus',
    name: 'The Hollow Colossus',
    family: 'hollow',
    maxHp: 1000,
    armor: 30,
    magicResist: 30,
    initiative: 6,
    critChance: 10,
    power: 3,
    precision: 9,
    abilities: ['warden_slam', 'warden_pulse', 'warden_seal'],
    isBoss: true,
  }),
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;

/**
 * Elite Rooms (request #31): the same enemies, significantly stronger.
 * PROVISIONAL multipliers.
 */
export const ELITE_RULES = {
  namePrefix: 'Elite',
  hpMultiplier: 1.75,
  powerMultiplier: 1.4,
  /** Extra Precision (more Focus per round). */
  precisionBonus: 2,
} as const;

export function getEnemy(id: string): EnemyDef | undefined {
  return (ENEMIES as Record<string, EnemyDef>)[id];
}
