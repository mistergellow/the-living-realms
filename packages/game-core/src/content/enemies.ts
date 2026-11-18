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
  initiative: number;
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
  rift_warden: enemy({
    id: 'rift_warden',
    name: 'Rift Warden',
    maxHp: 110,
    armor: 15,
    magicResist: 15,
    initiative: 5,
    dodgeChance: 0,
    critChance: 5,
    power: 1,
    abilities: ['warden_slam', 'warden_pulse', 'warden_seal'],
    isBoss: true,
  }),
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;

export function getEnemy(id: string): EnemyDef | undefined {
  return (ENEMIES as Record<string, EnemyDef>)[id];
}
