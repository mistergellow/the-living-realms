import type { Attributes, EquipSlot, ItemKind } from '@realms/shared';
import type { AbilityId } from './abilities.js';

/*
 * Item definitions (data). PROVISIONAL CONTENT. Weapons define how a
 * character attacks (D9); main hand + off hand abilities combine (D33).
 * Equipment may raise attributes (D21). Armor/resistance are ratings (D34).
 */

export type WeaponType =
  'sword' | 'axe' | 'dagger' | 'bow' | 'staff' | 'tome' | 'shield' | 'talisman';

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
  armor?: number;
  magicResist?: number;
}

const item = (i: ItemDef) => i;
const ACCESSORY: EquipSlot[] = ['accessory1', 'accessory2'];

export const ITEMS = {
  // ---- starter main-hand weapons ----
  training_sword: item({
    id: 'training_sword',
    name: 'Training Sword',
    description: 'Balanced blade. Scales with Might and Agility.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'sword',
    abilities: ['slash', 'cleave', 'rend'],
  }),
  woodcutter_axe: item({
    id: 'woodcutter_axe',
    name: 'Woodcutter Axe',
    description: 'Heavy hits. Scales with Might and Vitality. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'axe',
    abilities: ['chop', 'sunder'],
  }),
  rusty_dagger: item({
    id: 'rusty_dagger',
    name: 'Rusty Dagger',
    description: 'Fast and nasty. Scales with Agility and Precision. Can be held in either hand.',
    kind: 'weapon',
    slots: ['mainHand', 'offHand'],
    weaponType: 'dagger',
    abilities: ['stab', 'puncture', 'backstab', 'shadowstep'],
  }),
  hunting_bow: item({
    id: 'hunting_bow',
    name: 'Hunting Bow',
    description: 'Strikes any row. Scales with Precision and Agility. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'bow',
    abilities: ['aimed_shot', 'volley', 'marking_shot'],
  }),
  apprentice_staff: item({
    id: 'apprentice_staff',
    name: 'Apprentice Staff',
    description: 'Spells and healing. Scales with Arcana and Spirit. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'staff',
    abilities: ['staff_strike', 'arcane_bolt', 'firebolt', 'mend'],
  }),
  worn_tome: item({
    id: 'worn_tome',
    name: 'Worn Tome',
    description: 'Curses and sparks. Scales with Arcana and Precision. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'tome',
    abilities: ['spark', 'hex'],
  }),

  // ---- starter off-hands ----
  wooden_shield: item({
    id: 'wooden_shield',
    name: 'Wooden Shield',
    description: 'Block for yourself or an ally. Scales with Might and Vitality.',
    kind: 'offhand',
    slots: ['offHand'],
    weaponType: 'shield',
    abilities: ['raise_shield', 'guard_ally'],
    armor: 4,
  }),
  bone_talisman: item({
    id: 'bone_talisman',
    name: 'Bone Talisman',
    description: 'Small heals and wards. Scales with Spirit.',
    kind: 'offhand',
    slots: ['offHand'],
    weaponType: 'talisman',
    abilities: ['blessing', 'ward'],
    magicResist: 4,
  }),

  // ---- armor ----
  padded_tunic: item({
    id: 'padded_tunic',
    name: 'Padded Tunic',
    description: 'Quilted cloth. Better than nothing.',
    kind: 'armor',
    slots: ['body'],
    armor: 6,
  }),
  leather_cap: item({
    id: 'leather_cap',
    name: 'Leather Cap',
    description: 'Light head protection.',
    kind: 'armor',
    slots: ['head'],
    armor: 3,
  }),
  leather_leggings: item({
    id: 'leather_leggings',
    name: 'Leather Leggings',
    description: 'Light leg protection.',
    kind: 'armor',
    slots: ['legs'],
    armor: 4,
  }),

  // ---- accessories (drops) ----
  ring_of_vigor: item({
    id: 'ring_of_vigor',
    name: 'Ring of Vigor',
    description: 'Hardens the body.',
    kind: 'accessory',
    slots: ACCESSORY,
    bonuses: { vitality: 2 },
  }),
  charm_of_focus: item({
    id: 'charm_of_focus',
    name: 'Charm of Focus',
    description: 'Sharpens the mind.',
    kind: 'accessory',
    slots: ACCESSORY,
    bonuses: { arcana: 1, spirit: 1 },
  }),
  hawkeye_band: item({
    id: 'hawkeye_band',
    name: 'Hawkeye Band',
    description: 'Steadies the aim.',
    kind: 'accessory',
    slots: ACCESSORY,
    bonuses: { precision: 2 },
  }),
  brawler_wrap: item({
    id: 'brawler_wrap',
    name: 'Brawler Wrap',
    description: 'Strength in the swing.',
    kind: 'accessory',
    slots: ACCESSORY,
    bonuses: { might: 1, agility: 1 },
  }),
} satisfies Record<string, ItemDef>;

export type ItemDefId = keyof typeof ITEMS;

export function getItemDef(id: string): ItemDef | undefined {
  return (ITEMS as Record<string, ItemDef>)[id];
}

/** Main-hand weapons a new character can pick from. */
export const STARTER_WEAPONS: ItemDefId[] = [
  'training_sword',
  'woodcutter_axe',
  'rusty_dagger',
  'hunting_bow',
  'apprentice_staff',
  'worn_tome',
];
/** Optional off-hands at creation (only with one-handed weapons). */
export const STARTER_OFFHANDS: ItemDefId[] = ['wooden_shield', 'bone_talisman', 'rusty_dagger'];
/** Equipped automatically on every new character. */
export const STARTER_ARMOR: ItemDefId[] = ['padded_tunic'];
