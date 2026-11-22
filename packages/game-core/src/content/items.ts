import type { Attributes, EquipSlot, ItemKind, StarterKitId } from '@realms/shared';
import type { AbilityId } from './abilities.js';
import type { WeaponType } from './weapons.js';
import { customItemDef } from './custom.js';
import { skillBookId, SKILLS, type SkillDef } from './skills.js';
import type { ToolType } from './professions.js';

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
  /** Skill Books (request #47): reading it teaches this skill (and uses the book up). */
  teaches?: string;
  /**
   * Profession tools (request #51): carried in the bag. `tier` above 1 gives a
   * small success bonus; `minRank` is the Mastery rank needed to use it.
   */
  tool?: { type: ToolType; tier: number; minRank: number };
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
    abilities: ['slash', 'cleave'],
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
    description: 'Fast and nasty. Scales with Agility. Can be held in either hand.',
    kind: 'weapon',
    slots: ['mainHand', 'offHand'],
    weaponType: 'dagger',
    abilities: ['stab', 'backstab'],
  }),
  hunting_bow: item({
    id: 'hunting_bow',
    name: 'Hunting Bow',
    description: 'Strikes any position. Scales with Precision and Agility. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'bow',
    abilities: ['aimed_shot', 'marking_shot'],
  }),
  apprentice_staff: item({
    id: 'apprentice_staff',
    name: 'Apprentice Staff',
    description: 'Fire magic. Scales with Intellect and Will. Needs both hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'staff',
    abilities: ['staff_strike', 'firebolt'],
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
    abilities: ['thrust', 'skewer'],
  }),
  iron_mace: item({
    id: 'iron_mace',
    name: 'Iron Mace',
    description: 'Blunt and steady; weakens. Scales with Endurance. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'mace',
    abilities: ['crush', 'stagger'],
  }),
  birch_wand: item({
    id: 'birch_wand',
    name: 'Birch Wand',
    description: 'Precise bolts at any enemy. Scales with Intellect. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'wand',
    abilities: ['wand_bolt', 'focused_bolt'],
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
  // ---- request #45: one weapon of each new type (found in Rifts) ----
  iron_greatsword: item({
    id: 'iron_greatsword',
    name: 'Iron Greatsword',
    description: 'Rune-etched blade: wide swings. Might and Intellect. Two hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'greatsword',
    abilities: ['great_swing', 'executioner'],
  }),
  bearded_greataxe: item({
    id: 'bearded_greataxe',
    name: 'Bearded Greataxe',
    description: 'Enormous blows and bleeding wounds. Might. Two hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'greataxe',
    abilities: ['great_chop', 'rampage'],
  }),
  hand_axe: item({
    id: 'hand_axe',
    name: 'Hand Axe',
    description: 'Quick hacks; can be thrown. Agility and Endurance. One hand, either hand.',
    kind: 'weapon',
    slots: ['mainHand', 'offHand'],
    weaponType: 'handaxe',
    abilities: ['hack', 'throw_axe'],
  }),
  war_hammer: item({
    id: 'war_hammer',
    name: 'War Hammer',
    description: 'Crushing blows that can stun. Endurance and Will. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'hammer',
    abilities: ['hammer_blow', 'concuss'],
  }),
  great_maul: item({
    id: 'great_maul',
    name: 'Great Maul',
    description: 'Shakes and weakens the front line. Endurance and Intellect. Two hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'greathammer',
    abilities: ['great_smash', 'earthshaker'],
  }),
  morning_star: item({
    id: 'morning_star',
    name: 'Morning Star',
    description: 'Spiked blows that make enemies bleed. Might and Will. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'morningstar',
    abilities: ['spiked_blow', 'flail_spin'],
  }),
  knight_lance: item({
    id: 'knight_lance',
    name: "Knight's Lance",
    description: 'Long reach and marking charges. Precision and Endurance. Two hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'lance',
    abilities: ['lance_thrust', 'charge'],
  }),
  light_crossbow: item({
    id: 'light_crossbow',
    name: 'Light Crossbow',
    description: 'Slow, heavy bolts that pierce Dodge. Precision. Two hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'crossbow',
    abilities: ['bolt_shot', 'piercing_bolt'],
  }),
  // ---- request #46: the new types ----
  oak_scepter: item({
    id: 'oak_scepter',
    name: 'Oak Scepter',
    description: 'Holy light that smites and heals. Will. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'scepter',
    abilities: ['smite', 'radiance'],
  }),
  rune_chakram: item({
    id: 'rune_chakram',
    name: 'Rune Chakram',
    description: 'A spinning ring that ricochets. Agility and Intellect. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'chakram',
    abilities: ['chakram_throw', 'ricochet'],
  }),
  reaper_scythe: item({
    id: 'reaper_scythe',
    name: 'Reaper Scythe',
    description: 'Sweeps two enemies and drinks their life. Agility and Will. Two hands.',
    kind: 'weapon',
    slots: ['mainHand'],
    twoHanded: true,
    weaponType: 'scythe',
    abilities: ['reap', 'soul_harvest'],
  }),
  leather_sling: item({
    id: 'leather_sling',
    name: 'Leather Sling',
    description: 'Cheap stones at anyone; can stun. Precision and Will. One hand.',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'sling',
    abilities: ['sling_stone', 'stunning_shot'],
  }),
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

  // ---- request #50: belt and face slots ----
  leather_belt: item({
    id: 'leather_belt',
    name: 'Leather Belt',
    description: 'A sturdy belt. Slightly tougher.',
    kind: 'armor',
    slots: ['belt'],
    armor: 2,
    bonuses: { endurance: 1 },
  }),
  bone_mask: item({
    id: 'bone_mask',
    name: 'Bone Mask',
    description: 'A grim mask carved from bone. Hard to read.',
    kind: 'armor',
    slots: ['face'],
    armor: 1,
    bonuses: { will: 1 },
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

export type ItemDefId = keyof typeof ITEMS | MaterialId | ToolItemId;

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
  // Request #51: Scribing.
  parchment: material('parchment', 'Parchment', 'Scraped leather, ready to write on.'),
  ink: material('ink', 'Ink', 'Dark herbal ink.'),
  blank_scroll: material(
    'blank_scroll',
    'Blank Scroll',
    'Ruled parchment for scrolls. Scribes will write on it in a later update.',
  ),
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
  // Request #50: the blacksmith's scroll and the weapon-family materials.
  blessing_scroll: consumable(
    'blessing_scroll',
    'Blessing Scroll',
    'Used at the blacksmith: if an upgrade fails, the weapon loses 1 level instead of breaking.',
  ),
  blade_shard: material(
    'blade_shard',
    'Blade Shard',
    'Hardened steel for upgrading blades (+4 and up).',
  ),
  axe_iron: material('axe_iron', 'Axe Iron', 'Dense iron for upgrading axes (+4 and up).'),
  heavy_core: material(
    'heavy_core',
    'Heavy Core',
    'A weighted core for upgrading blunt weapons (+4 and up).',
  ),
  polearm_haft: material(
    'polearm_haft',
    'Ironwood Haft',
    'For upgrading spears and lances (+4 and up).',
  ),
  sinew_string: material(
    'sinew_string',
    'Sinew String',
    'For upgrading bows, crossbows, slings and chakrams (+4 and up).',
  ),
  arcane_focus: material(
    'arcane_focus',
    'Arcane Focus',
    'A humming crystal for upgrading staves, wands, tomes and scepters (+4 and up).',
  ),
} satisfies Record<string, ItemDef>;

export type MaterialId = keyof typeof MATERIALS;
Object.assign(ITEMS, MATERIALS);

/*
 * Profession tools (request #51). They are items in the bag, not equipment.
 * Basic tools are sold in the city store and made by Crafters; fine tools are
 * better (tier 2) but need an Apprentice to use them. A tool never replaces
 * Mastery: it makes the work possible and adds a small bonus.
 */
const tool = (
  id: string,
  name: string,
  description: string,
  type: ToolType,
  tier: number,
  minRank: number,
): ItemDef => ({ id, name, description, kind: 'tool', slots: [], tool: { type, tier, minRank } });

export const TOOLS = {
  fishing_rod: tool('fishing_rod', 'Fishing Rod', 'Needed to fish.', 'fishing_rod', 1, 0),
  felling_axe: tool('felling_axe', 'Felling Axe', 'Needed to chop wood.', 'axe', 1, 0),
  pickaxe: tool('pickaxe', 'Pickaxe', 'Needed to mine.', 'pickaxe', 1, 0),
  hunting_knife: tool('hunting_knife', 'Hunting Knife', 'Needed to hunt.', 'hunting_knife', 1, 0),
  fine_fishing_rod: tool(
    'fine_fishing_rod',
    'Fine Fishing Rod',
    'A better rod (+5% success). Needs an Apprentice Fisher.',
    'fishing_rod',
    2,
    1,
  ),
  fine_felling_axe: tool(
    'fine_felling_axe',
    'Fine Felling Axe',
    'A better axe (+5% success). Needs an Apprentice Lumberjack.',
    'axe',
    2,
    1,
  ),
  fine_pickaxe: tool(
    'fine_pickaxe',
    'Fine Pickaxe',
    'A better pick (+5% success). Needs an Apprentice Miner.',
    'pickaxe',
    2,
    1,
  ),
  fine_hunting_knife: tool(
    'fine_hunting_knife',
    'Fine Hunting Knife',
    'A better knife (+5% success). Needs an Apprentice Hunter.',
    'hunting_knife',
    2,
    1,
  ),
} satisfies Record<string, ItemDef>;
Object.assign(ITEMS, TOOLS);
export type ToolItemId = keyof typeof TOOLS;
/** Every new character carries the basic tools (request #51, PROVISIONAL: see open decisions). */
export const STARTER_TOOLS: ToolItemId[] = ['fishing_rod', 'felling_axe', 'pickaxe', 'hunting_knife'];

/**
 * Skill Books (request #47): one per skill. Read one (double-click in the bag)
 * to learn its skill; skills with requirements need those BASE attributes.
 */
export const SKILL_BOOKS: Record<string, ItemDef> = Object.fromEntries(
  Object.values(SKILLS).map((sk) => {
    const req = Object.entries((sk as SkillDef).requirements ?? {})
      .map(([k, v]) => `${k[0]!.toUpperCase()}${k.slice(1)} ${v}`)
      .join(', ');
    return [
      skillBookId(sk.id),
      {
        id: skillBookId(sk.id),
        name: `Book: ${sk.name}`,
        description: `Teaches ${sk.name}. ${sk.description}${req ? ` Requires ${req}.` : ''}`,
        kind: 'consumable' as const,
        slots: [],
        teaches: sk.id,
      },
    ];
  }),
);
Object.assign(ITEMS, SKILL_BOOKS);

/** Materials and consumables stack in the inventory. */
export const isStackable = (def: ItemDef | undefined) =>
  def?.kind === 'material' || def?.kind === 'consumable';
