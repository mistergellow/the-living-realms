import type { CustomAbilityDto, CustomContentDto, CustomItemDto } from '@realms/shared';
import type { AbilityDef, AbilityId } from './abilities.js';
import type { ItemDef } from './items.js';
import { getWeaponType, type WeaponType } from './weapons.js';

/*
 * Custom content registry (admin tools, request #41). Items and abilities
 * created by the admin live in the database; the server and every client load
 * them here, and `getItemDef`/`getAbility` fall back to this registry. Built-in
 * content always wins: a custom id can never replace a built-in one.
 *
 * This keeps game-core free of I/O: the registry is filled by the caller.
 */

const items = new Map<string, ItemDef>();
const abilities = new Map<string, AbilityDef>();

export const CUSTOM_ID_PREFIX = 'custom_';

export function customItemDef(id: string): ItemDef | undefined {
  return items.get(id);
}
export function customAbilityDef(id: string): AbilityDef | undefined {
  return abilities.get(id);
}
export function listCustomItemDefs(): ItemDef[] {
  return [...items.values()];
}
export function listCustomAbilityDefs(): AbilityDef[] {
  return [...abilities.values()];
}

export function toCustomItemDef(d: CustomItemDto): ItemDef {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    kind: d.kind,
    slots: d.slots,
    ...(d.weaponType ? { weaponType: d.weaponType as WeaponType } : {}),
    twoHanded: getWeaponType(d.weaponType)?.hands === 2,
    abilities: d.abilities as AbilityId[],
    bonuses: d.bonuses,
    armor: d.armor,
    magicResist: d.magicResist,
  };
}

export function toCustomAbilityDef(d: CustomAbilityDto): AbilityDef {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    source: d.source,
    focusCost: d.focusCost,
    manaCost: d.manaCost,
    targeting: d.targeting,
    effects: d.effects,
    scaling: d.scaling,
  };
}

/** Replace the whole registry (server start-up, client load, after an admin change). */
export function setCustomContent(content: CustomContentDto): void {
  items.clear();
  abilities.clear();
  for (const a of content.abilities) abilities.set(a.id, toCustomAbilityDef(a));
  for (const i of content.items) items.set(i.id, toCustomItemDef(i));
}
