import type { Attributes, EquipSlot, ItemKind, StarterKitId } from '@realms/shared';
import type { AbilityId } from './abilities.js';
import type { WeaponType } from './weapons.js';
import { customItemDef } from './custom.js';

export type { WeaponType } from './weapons.js';

/*
 * Item definitions (data). PROVISIONAL CONTENT. Weapons define how a
 * character attacks (D9); main hand + off hand abilities combine (D33).
 * Equipment may raise attributes (D21). Armor/resistance are ratings (D34).
 * Weapon base stats come from the weapon catalogue (`weapons.ts`, request #31):
 * every weapon of a type shares the same numbers and basic attack. The first
 * ability of a weapon is its basic attack.
 */

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
  /** BASE attributes needed to equip it (request #37); weapons add their primary. */
  requirements?: Partial<Attributes>;
}

const item = (i: ItemDef) => i;
const RING: EquipSlot[] = ['ring1', 'ring2'];
const PENDANT: EquipSlot[] = ['pendant'];

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
    description: 'Heavy hits. Scales with Might and Endurance. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
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
    description: 'Magic and healing. Scales with Intellect and Will. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'staff',
    abilities: ['staff_strike', 'arcane_bolt', 'firebolt', 'mend'],
  }),
  ash_spear: item({
    id: 'ash_spear',
    name: 'Ash Spear',
    description:
      'Long reach: strikes the two nearest columns. Scales with Might and Precision. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'spear',
    abilities: ['thrust'],
  }),
  iron_mace: item({
    id: 'iron_mace',
    name: 'Iron Mace',
    description: 'Blunt and steady. Scales with Might and Endurance. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'mace',
    abilities: ['crush'],
  }),
  birch_wand: item({
    id: 'birch_wand',
    name: 'Birch Wand',
    description: 'Precise bolts at any enemy. Scales with Intellect and Precision. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'wand',
    abilities: ['wand_bolt'],
  }),
  worn_tome: item({
    id: 'worn_tome',
    name: 'Worn Tome',
    description: 'Curses and sparks. Scales with Intellect and Precision. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'tome',
    abilities: ['spark', 'hex'],
  }),

  // ---- starter off-hands ----
  wooden_shield: item({
    id: 'wooden_shield',
    name: 'Wooden Shield',
    description: 'Dodge for yourself or a whole column. Scales with Might and Endurance.',
    kind: 'offhand',
    slots: ['offHand'],
    weaponType: 'shield',
    abilities: ['raise_shield', 'shield_wall'],
    armor: 4,
  }),
  bone_talisman: item({
    id: 'bone_talisman',
    name: 'Bone Talisman',
    description: 'Small heals and wards. Scales with Will.',
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
  leather_boots: item({
    id: 'leather_boots',
    name: 'Leather Boots',
    description: 'Sturdy boots for the road.',
    kind: 'armor',
    slots: ['feet'],
    armor: 4,
  }),

  // ---- accessories (drops): rings and pendants (request #39) ----
  ring_of_vigor: item({
    id: 'ring_of_vigor',
    name: 'Ring of Vigor',
    description: 'Hardens the body.',
    kind: 'accessory',
    slots: RING,
    bonuses: { endurance: 2 },
  }),
  /** World boss season 1 reward (request #44), for the party that dealt the most damage. */
  hollow_heart: item({
    id: 'hollow_heart',
    name: 'Heart of the Hollow',
    description: 'Taken from the Hollow Colossus by the party that hurt it most. Season 1.',
    kind: 'accessory',
    slots: PENDANT,
    bonuses: { might: 2, agility: 2, precision: 2, endurance: 2, intellect: 2, will: 2 },
  }),
  charm_of_focus: item({
    id: 'charm_of_focus',
    name: 'Charm of Focus',
    description: 'A pendant that sharpens the mind.',
    kind: 'accessory',
    slots: PENDANT,
    bonuses: { intellect: 1, will: 1 },
  }),
  hawkeye_band: item({
    id: 'hawkeye_band',
    name: 'Hawkeye Band',
    description: 'Steadies the aim.',
    kind: 'accessory',
    slots: RING,
    bonuses: { precision: 2 },
  }),
  brawler_wrap: item({
    id: 'brawler_wrap',
    name: 'Brawler Wrap',
    description: 'Strength in the swing.',
    kind: 'accessory',
    slots: RING,
    bonuses: { might: 1, agility: 1 },
  }),
} satisfies Record<string, ItemDef>;

export type ItemDefId = keyof typeof ITEMS | MaterialId;

export function getItemDef(id: string): ItemDef | undefined {
  // Built-in content first; then admin-made items (request #41).
  return Object.hasOwn(ITEMS, id) ? (ITEMS as Record<string, ItemDef>)[id] : customItemDef(id);
}

/** Main-hand weapons a new character can pick from. */
export const STARTER_WEAPONS: ItemDefId[] = [
  'training_sword',
  'woodcutter_axe',
  'rusty_dagger',
  'ash_spear',
  'iron_mace',
  'hunting_bow',
  'apprentice_staff',
  'birch_wand',
  'worn_tome',
];
/** Optional off-hands at creation (only with one-handed weapons). */
export const STARTER_OFFHANDS: ItemDefId[] = ['wooden_shield', 'bone_talisman', 'rusty_dagger'];
/** Equipped automatically on every new character. */
export const STARTER_ARMOR: ItemDefId[] = ['padded_tunic'];

/**
 * Starting kits (request #43): the only choice of gear at creation. The
 * Fireball kit starts with a wand and the Fireball spell learned and prepared.
 */
export const STARTER_KITS = [
  { id: 'sword', name: 'Sword', weapon: 'training_sword', skills: [] },
  { id: 'bow', name: 'Bow', weapon: 'hunting_bow', skills: [] },
  { id: 'dagger', name: 'Dagger', weapon: 'rusty_dagger', skills: [] },
  { id: 'fireball', name: 'Fireball', weapon: 'birch_wand', skills: ['fireball'] },
] as const satisfies ReadonlyArray<{
  id: StarterKitId;
  name: string;
  weapon: ItemDefId;
  skills: readonly string[];
}>;
export const getStarterKit = (id: string) => STARTER_KITS.find((k) => k.id === id);

/*
 * Materials and consumables (professions, request #33). They stack and cannot
 * be equipped. Consumables cannot be used yet (future: recovery in the Rift).
 * PROVISIONAL CONTENT.
 */
const material = (id: string, name: string, description: string): ItemDef => ({
  id,
  name,
  description,
  kind: 'material',
  slots: [],
});
const consumable = (id: string, name: string, description: string): ItemDef => ({
  id,
  name,
  description,
  kind: 'consumable',
  slots: [],
});

export const MATERIALS = {
  raw_fish: material('raw_fish', 'Raw Fish', 'A fresh catch. Cook it before eating.'),
  iron_ore: material('iron_ore', 'Iron Ore', 'Smelt it into ingots.'),
  rough_gem: material('rough_gem', 'Rough Gem', 'An uncut stone with a faint glow.'),
  iron_ingot: material('iron_ingot', 'Iron Ingot', 'Used to repair and improve gear.'),
  log: material('log', 'Log', 'Raw timber.'),
  plank: material('plank', 'Plank', 'Sawn wood for carpentry.'),
  herb: material('herb', 'Rift Moss', 'A medicinal herb that grows near rifts.'),
  raw_hide: material('raw_hide', 'Raw Hide', 'Needs curing before use.'),
  leather: material('leather', 'Leather', 'Cured hide for leatherworking.'),
  raw_meat: material('raw_meat', 'Raw Meat', 'Game meat. Cook it first.'),
  grain: material('grain', 'Grain', 'A sack of grain.'),
  flax: material('flax', 'Flax', 'Fibres for weaving.'),
  linen: material('linen', 'Linen', 'Woven cloth.'),
  cut_gem: material('cut_gem', 'Cut Gem', 'A polished gem for jewellery.'),
  rune_stone: material(
    'rune_stone',
    'Rune Stone',
    'A blank stone shaped by a runesmith. Runes come later.',
  ),
  grilled_fish: consumable('grilled_fish', 'Grilled Fish', 'A simple, filling meal.'),
  hearty_stew: consumable('hearty_stew', 'Hearty Stew', 'A warming meal.'),
  healing_draught: consumable('healing_draught', 'Healing Draught', 'Restores health.'),
  mana_tonic: consumable('mana_tonic', 'Mana Tonic', 'Restores mana.'),
  bandage: consumable('bandage', 'Bandage', 'Stops bleeding.'),
} satisfies Record<string, ItemDef>;

export type MaterialId = keyof typeof MATERIALS;
Object.assign(ITEMS, MATERIALS);

/** Materials and consumables stack in the inventory. */
export const isStackable = (def: ItemDef | undefined) =>
  def?.kind === 'material' || def?.kind === 'consumable';
