import type { AbilityId } from './abilities.js';

/*
 * Enemy definitions (data). PROVISIONAL CONTENT: neutral placeholder names
 * and numbers, to be replaced/tuned with the project owner.
 */

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  defense: number;
  initiative: number;
  dodgeChance: number;
  critChance: number;
  physicalPower: number;
  rangedPower: number;
  spellPower: number;
  resistance: number;
  abilities: AbilityId[];
  isBoss?: boolean;
}

const enemy = (e: EnemyDef) => e;

export const ENEMIES = {
  rift_husk: enemy({
    id: 'rift_husk',
    name: 'Rift Husk',
    maxHp: 16,
    defense: 1,
    initiative: 0,
    dodgeChance: 0,
    critChance: 5,
    physicalPower: 0,
    rangedPower: 0,
    spellPower: 0,
    resistance: 0,
    abilities: ['husk_claw'],
  }),
  shard_spitter: enemy({
    id: 'shard_spitter',
    name: 'Shard Spitter',
    maxHp: 10,
    defense: 0,
    initiative: 2,
    dodgeChance: 10,
    critChance: 5,
    physicalPower: 0,
    rangedPower: 0,
    spellPower: 0,
    resistance: 0,
    abilities: ['spit_shard'],
  }),
  hollow_hound: enemy({
    id: 'hollow_hound',
    name: 'Hollow Hound',
    maxHp: 14,
    defense: 0,
    initiative: 3,
    dodgeChance: 15,
    critChance: 10,
    physicalPower: 0,
    rangedPower: 0,
    spellPower: 0,
    resistance: 0,
    abilities: ['hound_lunge'],
  }),
  rift_warden: enemy({
    id: 'rift_warden',
    name: 'Rift Warden',
    maxHp: 70,
    defense: 2,
    initiative: 1,
    dodgeChance: 0,
    critChance: 5,
    physicalPower: 1,
    rangedPower: 0,
    spellPower: 1,
    resistance: 1,
    abilities: ['warden_slam', 'warden_pulse'],
    isBoss: true,
  }),
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;

export function getEnemy(id: string): EnemyDef | undefined {
  return (ENEMIES as Record<string, EnemyDef>)[id];
}
