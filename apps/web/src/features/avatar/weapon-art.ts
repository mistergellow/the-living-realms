import { getItemDef } from '@realms/game-core';
import type { OffhandArt, WeaponArt } from './CharacterAvatar';

const MAIN: Record<string, WeaponArt> = {
  sword: 'sword',
  axe: 'axe',
  dagger: 'dagger',
  bow: 'bow',
  staff: 'staff',
  tome: 'tome',
  spear: 'spear',
  mace: 'mace',
  wand: 'wand',
  greatsword: 'greatsword',
  greataxe: 'greataxe',
  handaxe: 'handaxe',
  hammer: 'hammer',
  greathammer: 'greathammer',
  morningstar: 'morningstar',
  lance: 'lance',
  crossbow: 'crossbow',
  scepter: 'scepter',
  chakram: 'chakram',
  scythe: 'scythe',
  sling: 'sling',
};
const OFF: Record<string, OffhandArt> = {
  shield: 'shield',
  talisman: 'talisman',
  dagger: 'dagger',
  handaxe: 'handaxe',
};

/** Which main-hand weapon to draw for an equipped item definition id. */
export function weaponArtFor(defId: string | null | undefined): WeaponArt {
  const w = defId ? getItemDef(defId)?.weaponType : undefined;
  return (w && MAIN[w]) || null;
}

export function offhandArtFor(defId: string | null | undefined): OffhandArt {
  const w = defId ? getItemDef(defId)?.weaponType : undefined;
  return (w && OFF[w]) || null;
}

/** Weapon art from a combatant's ability list (the combat view has no items). */
/** Basic attack → weapon art (the combat view only has the ability list). */
const ART_BY_BASIC: Array<[string, Exclude<WeaponArt, null>]> = [
  ['smite', 'scepter'],
  ['chakram_throw', 'chakram'],
  ['reap', 'scythe'],
  ['sling_stone', 'sling'],
  ['great_swing', 'greatsword'],
  ['great_chop', 'greataxe'],
  ['great_smash', 'greathammer'],
  ['hammer_blow', 'hammer'],
  ['spiked_blow', 'morningstar'],
  ['lance_thrust', 'lance'],
  ['bolt_shot', 'crossbow'],
  ['hack', 'handaxe'],
  ['slash', 'sword'],
  ['chop', 'axe'],
  ['thrust', 'spear'],
  ['crush', 'mace'],
  ['aimed_shot', 'bow'],
  ['arcane_bolt', 'staff'],
  ['wand_bolt', 'wand'],
  ['spark', 'tome'],
  ['stab', 'dagger'],
];

/** Weapon art from a combatant's ability list (the combat view has no items). */
export function artFromAbilities(abilityIds: string[]): { weapon: WeaponArt; offhand: OffhandArt } {
  const has = (id: string) => abilityIds.includes(id);
  const weapon: WeaponArt = ART_BY_BASIC.find(([id]) => has(id))?.[1] ?? null;
  const offhand: OffhandArt = has('raise_shield')
    ? 'shield'
    : has('blessing')
      ? 'talisman'
      : weapon !== 'dagger' && has('stab')
        ? 'dagger'
        : weapon !== 'handaxe' && has('hack')
          ? 'handaxe'
          : null;
  return { weapon, offhand };
}
