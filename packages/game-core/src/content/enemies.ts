import type { AbilityId } from './abilities.js';

/*
 * Enemy definitions (data). PROVISIONAL CONTENT: neutral placeholder names
 * and numbers, tuned by simulation. `power` multiplies all ability values.
 */

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  armor: number;
  magicResist: number;
  /** Agility-like value added to the initiative roll. */
  initiative: number;
  /** Precision: Focus per round, same rule as players (default 5 → 3 Focus). */
  precision?: number;
  dodgeChance: number;
  critChance: number;
  power: number;
  abilities: AbilityId[];
  isBoss?: boolean;
}

const enemy = (e: EnemyDef) => e;

export const ENEMIES = {
  rift_husk: enemy({
    id: 'rift_husk',
    name: 'Rift Husk',
    maxHp: 26,
    armor: 8,
    magicResist: 0,
    initiative: 3,
    dodgeChance: 0,
    critChance: 5,
    power: 1,
    abilities: ['husk_claw'],
  }),
  shard_spitter: enemy({
    id: 'shard_spitter',
    name: 'Shard Spitter',
    maxHp: 18,
    armor: 0,
    magicResist: 10,
    initiative: 7,
    dodgeChance: 10,
    critChance: 5,
    power: 1,
    abilities: ['spit_shard'],
  }),
  hollow_hound: enemy({
    id: 'hollow_hound',
    name: 'Hollow Hound',
    maxHp: 22,
    armor: 4,
    magicResist: 4,
    initiative: 9,
    dodgeChance: 15,
    critChance: 10,
    power: 1,
    abilities: ['hound_lunge'],
  }),
  rift_bulwark: enemy({
    id: 'rift_bulwark',
    name: 'Rift Bulwark',
    maxHp: 30,
    armor: 20,
    magicResist: 5,
    initiative: 1,
    dodgeChance: 0,
    critChance: 0,
    power: 1,
    abilities: ['bulwark_wall', 'bulwark_bash'],
  }),
  rift_warden: enemy({
    id: 'rift_warden',
    name: 'Rift Warden',
    maxHp: 125,
    armor: 15,
    magicResist: 15,
    initiative: 5,
    dodgeChance: 0,
    critChance: 5,
    power: 1,
    precision: 7,
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
  hpMultiplier: 1.6,
  powerMultiplier: 1.3,
  /** Extra Precision (more Focus per round). */
  precisionBonus: 2,
} as const;

export function getEnemy(id: string): EnemyDef | undefined {
  return (ENEMIES as Record<string, EnemyDef>)[id];
}
