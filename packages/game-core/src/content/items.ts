import type { Attributes, EquipSlot, ItemKind } from '@realms/shared';
import type { AbilityId } from './abilities.js';

/*
 * Item definitions (data). PROVISIONAL CONTENT — placeholders to be tuned with
 * the project owner. Weapons define how a character attacks (decision D9):
 * equipping one grants its abilities. Equipment may raise attributes (D21).
 */

export type WeaponType = 'sword' | 'bow' | 'staff';

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  slots: EquipSlot[];
  twoHanded?: boolean;
  weaponType?: WeaponType;
  abilities?: AbilityId[];
  bonuses?: Partial<Attributes>;
  defense?: number;
}

const item = (i: ItemDef) => i;
const ACCESSORY: EquipSlot[] = ['accessory1', 'accessory2'];

export const ITEMS = {
  // ---- starter weapons ----
  training_sword: item({
    id: 'training_sword',
    name: 'Training Sword',
    description: 'A plain, reliable blade. Fights up close.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'sword',
    abilities: ['slash', 'cleave'],
  }),
  hunting_bow: item({
    id: 'hunting_bow',
    name: 'Hunting Bow',
    description: 'Strikes any row from afar. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'bow',
    abilities: ['aimed_shot', 'volley'],
  }),
  apprentice_staff: item({
    id: 'apprentice_staff',
    name: 'Apprentice Staff',
    description: 'Channels spells that cost mana. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'staff',
    abilities: ['staff_strike', 'arcane_bolt', 'mend'],
  }),

  // ---- starter armor ----
  padded_tunic: item({
    id: 'padded_tunic',
    name: 'Padded Tunic',
    description: 'Quilted cloth. Better than nothing.',
    kind: 'armor',
    slots: ['body'],
    defense: 1,
  }),

  // ---- future drops (not obtainable yet) ----
  wooden_shield: item({
    id: 'wooden_shield',
    name: 'Wooden Shield',
    description: 'Blocks some blows.',
    kind: 'offhand',
    slots: ['offHand'],
    defense: 2,
  }),
  leather_cap: item({
    id: 'leather_cap',
    name: 'Leather Cap',
    description: 'Light head protection.',
    kind: 'armor',
    slots: ['head'],
    defense: 1,
  }),
  leather_leggings: item({
    id: 'leather_leggings',
    name: 'Leather Leggings',
    description: 'Light leg protection.',
    kind: 'armor',
    slots: ['legs'],
    defense: 1,
  }),
  ring_of_vigor: item({
    id: 'ring_of_vigor',
    name: 'Ring of Vigor',
    description: 'Hardens the body.',
    kind: 'accessory',
    slots: ACCESSORY,
    bonuses: { con: 1 },
  }),
  charm_of_focus: item({
    id: 'charm_of_focus',
    name: 'Charm of Focus',
    description: 'Sharpens the mind.',
    kind: 'accessory',
    slots: ACCESSORY,
    bonuses: { int: 1, wis: 1 },
  }),
} satisfies Record<string, ItemDef>;

export type ItemDefId = keyof typeof ITEMS;

export function getItemDef(id: string): ItemDef | undefined {
  return (ITEMS as Record<string, ItemDef>)[id];
}

/** Weapons a new character can pick from. */
export const STARTER_WEAPONS: ItemDefId[] = ['training_sword', 'hunting_bow', 'apprentice_staff'];
/** Equipped automatically on every new character (besides the chosen weapon). */
export const STARTER_ARMOR: ItemDefId[] = ['padded_tunic'];
