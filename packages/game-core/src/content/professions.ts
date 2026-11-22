import type { MaterialId, ItemDefId } from './items.js';
import type { Terrain } from './world-map.js';

/*
 * Professions (request #33, "like Project Zomboid"): every character can
 * practise all of them; each has a level (0–10) that raises the chance of
 * success and the results (more yield, bigger repairs, better upgrades).
 * Activities are data. ALL NUMBERS ARE PROVISIONAL — to be balanced later.
 */

export type ProfessionCategory = 'gathering' | 'crafting' | 'service';

export interface ActivityDef {
  id: string;
  name: string;
  description: string;
  /** Level needed to try it. */
  minLevel: number;
  /** Chance of success at level 0 (percent); each level adds PROFESSION_RULES.successPerLevel. */
  baseChance: number;
  /** Seconds before this profession can be practised again (time cost, until AP exists). */
  cooldownSeconds: number;
  xpSuccess: number;
  xpFailure: number;
  /** Consumed on every attempt (success or failure). */
  inputs: Array<{ item: MaterialId; qty: number }>;
  /** Produced on success; each level gives a chance of one extra (yieldPerLevel). */
  outputs: Array<{ item: ItemDefId; min: number; max: number }>;
  /** Activities that work on one of your items. */
  effect?: 'repair' | 'upgrade';
}

export interface ProfessionDef {
  id: string;
  name: string;
  /** What a practitioner is called. */
  title: string;
  category: ProfessionCategory;
  description: string;
  activities: ActivityDef[];
}

export const PROFESSION_RULES = {
  maxLevel: 10,
  /** XP to go from `level` to `level + 1` = xpBase + xpPerLevel × level. */
  xpBase: 40,
  xpPerLevel: 30,
  /** +5% success per level. */
  successPerLevel: 5,
  maxChance: 95,
  minChance: 5,
  /** Each level: +10% chance of one extra item on success. */
  yieldPerLevel: 10,
  /** Repairs: quality restored = repairBase + repairPerLevel × level. */
  repairBase: 15,
  repairPerLevel: 4,
  /** Weapon upgrades: each existing +1 makes the next one harder. */
  upgradePenaltyPerLevel: 15,
  maxWeaponUpgrade: 5,
} as const;

const act = (a: Partial<ActivityDef> & Pick<ActivityDef, 'id' | 'name' | 'description'>) =>
  ({
    minLevel: 0,
    baseChance: 70,
    cooldownSeconds: 20,
    xpSuccess: 10,
    xpFailure: 4,
    inputs: [],
    outputs: [],
    ...a,
  }) satisfies ActivityDef;
const prof = (p: ProfessionDef) => p;

export const PROFESSIONS = {
  // ---- gathering ----
  fishing: prof({
    id: 'fishing',
    name: 'Fishing',
    title: 'Fisher',
    category: 'gathering',
    description: 'Catch fish in rivers and lakes.',
    activities: [
      act({
        id: 'fish',
        name: 'Fish',
        description: 'Cast a line and wait.',
        outputs: [{ item: 'raw_fish', min: 1, max: 2 }],
      }),
    ],
  }),
  mining: prof({
    id: 'mining',
    name: 'Mining',
    title: 'Miner',
    category: 'gathering',
    description: 'Dig ore and gems out of the rock.',
    activities: [
      act({
        id: 'mine_iron',
        name: 'Mine iron',
        description: 'Break iron ore from a vein.',
        baseChance: 65,
        outputs: [{ item: 'iron_ore', min: 1, max: 2 }],
      }),
      act({
        id: 'mine_gems',
        name: 'Search for gems',
        description: 'Rare stones hide deep in the rock.',
        minLevel: 3,
        baseChance: 35,
        xpSuccess: 20,
        outputs: [{ item: 'rough_gem', min: 1, max: 1 }],
      }),
    ],
  }),
  woodcutting: prof({
    id: 'woodcutting',
    name: 'Woodcutting',
    title: 'Lumberjack',
    category: 'gathering',
    description: 'Fell trees for timber.',
    activities: [
      act({
        id: 'chop',
        name: 'Chop wood',
        description: 'Fell a tree and cut it into logs.',
        baseChance: 75,
        outputs: [{ item: 'log', min: 1, max: 3 }],
      }),
    ],
  }),
  herbalism: prof({
    id: 'herbalism',
    name: 'Herbalism',
    title: 'Herbalist',
    category: 'gathering',
    description: 'Find medicinal plants.',
    activities: [
      act({
        id: 'gather_herbs',
        name: 'Gather herbs',
        description: 'Search the ground for Rift Moss.',
        outputs: [{ item: 'herb', min: 1, max: 2 }],
      }),
    ],
  }),
  hunting: prof({
    id: 'hunting',
    name: 'Hunting',
    title: 'Hunter',
    category: 'gathering',
    description: 'Track and hunt game for hides and meat.',
    activities: [
      act({
        id: 'hunt',
        name: 'Hunt',
        description: 'Track an animal through the woods.',
        baseChance: 55,
        xpSuccess: 14,
        outputs: [
          { item: 'raw_hide', min: 1, max: 1 },
          { item: 'raw_meat', min: 1, max: 2 },
        ],
      }),
    ],
  }),
  farming: prof({
    id: 'farming',
    name: 'Farming',
    title: 'Farmer',
    category: 'gathering',
    description: 'Grow grain and flax.',
    activities: [
      act({
        id: 'harvest_grain',
        name: 'Harvest grain',
        description: 'Tend and reap a field of grain.',
        baseChance: 80,
        outputs: [{ item: 'grain', min: 1, max: 3 }],
      }),
      act({
        id: 'harvest_flax',
        name: 'Harvest flax',
        description: 'Pull flax for its fibres.',
        baseChance: 70,
        outputs: [{ item: 'flax', min: 1, max: 2 }],
      }),
    ],
  }),

  // ---- crafting ----
  blacksmithing: prof({
    id: 'blacksmithing',
    name: 'Blacksmithing',
    title: 'Blacksmith',
    category: 'crafting',
    description: 'Smelt metal, repair gear and improve weapons.',
    activities: [
      act({
        id: 'smelt',
        name: 'Smelt iron',
        description: 'Two ore make one ingot.',
        inputs: [{ item: 'iron_ore', qty: 2 }],
        outputs: [{ item: 'iron_ingot', min: 1, max: 1 }],
      }),
      act({
        id: 'repair',
        name: 'Repair gear',
        description: 'Restore quality to an item (broken items too).',
        baseChance: 75,
        inputs: [{ item: 'iron_ingot', qty: 1 }],
        effect: 'repair',
      }),
      // Weapon upgrades moved to the city blacksmith (request #50, Metin2 style).
    ],
  }),
  runesmithing: prof({
    id: 'runesmithing',
    name: 'Runesmithing',
    title: 'Runesmith',
    category: 'crafting',
    description: 'Shape rune stones. Runes and rune slots come in a later update.',
    activities: [
      act({
        id: 'shape_rune_stone',
        name: 'Shape a rune stone',
        description: 'Grind a gem into a blank rune stone.',
        baseChance: 50,
        xpSuccess: 20,
        inputs: [{ item: 'rough_gem', qty: 1 }],
        outputs: [{ item: 'rune_stone', min: 1, max: 1 }],
      }),
    ],
  }),
  carpentry: prof({
    id: 'carpentry',
    name: 'Carpentry',
    title: 'Carpenter',
    category: 'crafting',
    description: 'Work wood into planks, shields and staves.',
    activities: [
      act({
        id: 'saw_planks',
        name: 'Saw planks',
        description: 'One log makes two planks.',
        inputs: [{ item: 'log', qty: 1 }],
        outputs: [{ item: 'plank', min: 2, max: 2 }],
      }),
      act({
        id: 'craft_shield',
        name: 'Make a wooden shield',
        description: 'Planks bound into a shield.',
        minLevel: 2,
        baseChance: 55,
        xpSuccess: 25,
        inputs: [{ item: 'plank', qty: 4 }],
        outputs: [{ item: 'wooden_shield', min: 1, max: 1 }],
      }),
    ],
  }),
  leatherworking: prof({
    id: 'leatherworking',
    name: 'Leatherworking',
    title: 'Leatherworker',
    category: 'crafting',
    description: 'Cure hides and make leather armour.',
    activities: [
      act({
        id: 'cure_hide',
        name: 'Cure hide',
        description: 'Turn a raw hide into leather.',
        inputs: [{ item: 'raw_hide', qty: 1 }],
        outputs: [{ item: 'leather', min: 1, max: 1 }],
      }),
      act({
        id: 'craft_cap',
        name: 'Make a leather cap',
        description: 'Light head protection.',
        minLevel: 1,
        baseChance: 60,
        xpSuccess: 20,
        inputs: [{ item: 'leather', qty: 2 }],
        outputs: [{ item: 'leather_cap', min: 1, max: 1 }],
      }),
      act({
        id: 'craft_boots',
        name: 'Make leather boots',
        description: 'Sturdy boots for the road.',
        minLevel: 2,
        baseChance: 55,
        xpSuccess: 25,
        inputs: [{ item: 'leather', qty: 3 }],
        outputs: [{ item: 'leather_boots', min: 1, max: 1 }],
      }),
    ],
  }),
  tailoring: prof({
    id: 'tailoring',
    name: 'Tailoring',
    title: 'Tailor',
    category: 'crafting',
    description: 'Weave cloth and sew clothing.',
    activities: [
      act({
        id: 'weave_linen',
        name: 'Weave linen',
        description: 'Two flax make one linen.',
        inputs: [{ item: 'flax', qty: 2 }],
        outputs: [{ item: 'linen', min: 1, max: 1 }],
      }),
      act({
        id: 'sew_tunic',
        name: 'Sew a padded tunic',
        description: 'Quilted body armour.',
        minLevel: 2,
        baseChance: 55,
        xpSuccess: 25,
        inputs: [{ item: 'linen', qty: 3 }],
        outputs: [{ item: 'padded_tunic', min: 1, max: 1 }],
      }),
    ],
  }),
  jewelcrafting: prof({
    id: 'jewelcrafting',
    name: 'Jewelcrafting',
    title: 'Jeweller',
    category: 'crafting',
    description: 'Cut gems and make rings and charms.',
    activities: [
      act({
        id: 'cut_gem',
        name: 'Cut a gem',
        description: 'Polish a rough gem.',
        baseChance: 55,
        xpSuccess: 15,
        inputs: [{ item: 'rough_gem', qty: 1 }],
        outputs: [{ item: 'cut_gem', min: 1, max: 1 }],
      }),
      act({
        id: 'craft_ring',
        name: 'Make a Ring of Vigor',
        description: 'A gem set in iron.',
        minLevel: 3,
        baseChance: 45,
        xpSuccess: 35,
        xpFailure: 10,
        inputs: [
          { item: 'cut_gem', qty: 1 },
          { item: 'iron_ingot', qty: 1 },
        ],
        outputs: [{ item: 'ring_of_vigor', min: 1, max: 1 }],
      }),
    ],
  }),
  alchemy: prof({
    id: 'alchemy',
    name: 'Alchemy',
    title: 'Alchemist',
    category: 'crafting',
    description: 'Brew draughts and tonics.',
    activities: [
      act({
        id: 'brew_healing',
        name: 'Brew a healing draught',
        description: 'Two herbs, boiled down.',
        baseChance: 60,
        xpSuccess: 15,
        inputs: [{ item: 'herb', qty: 2 }],
        outputs: [{ item: 'healing_draught', min: 1, max: 1 }],
      }),
      act({
        id: 'brew_mana',
        name: 'Brew a mana tonic',
        description: 'Three herbs, distilled.',
        minLevel: 2,
        baseChance: 55,
        xpSuccess: 20,
        inputs: [{ item: 'herb', qty: 3 }],
        outputs: [{ item: 'mana_tonic', min: 1, max: 1 }],
      }),
    ],
  }),
  cooking: prof({
    id: 'cooking',
    name: 'Cooking',
    title: 'Cook',
    category: 'crafting',
    description: 'Turn raw food into meals.',
    activities: [
      act({
        id: 'grill_fish',
        name: 'Grill fish',
        description: 'A simple meal.',
        baseChance: 80,
        inputs: [{ item: 'raw_fish', qty: 1 }],
        outputs: [{ item: 'grilled_fish', min: 1, max: 1 }],
      }),
      act({
        id: 'cook_stew',
        name: 'Cook a stew',
        description: 'Meat and grain.',
        minLevel: 1,
        baseChance: 65,
        xpSuccess: 15,
        inputs: [
          { item: 'raw_meat', qty: 1 },
          { item: 'grain', qty: 1 },
        ],
        outputs: [{ item: 'hearty_stew', min: 1, max: 1 }],
      }),
    ],
  }),

  // ---- service ----
  medicine: prof({
    id: 'medicine',
    name: 'Medicine',
    title: 'Healer',
    category: 'service',
    description: 'Prepare bandages and treat wounds.',
    activities: [
      act({
        id: 'make_bandages',
        name: 'Make bandages',
        description: 'Cut linen into bandages.',
        baseChance: 80,
        inputs: [{ item: 'linen', qty: 1 }],
        outputs: [{ item: 'bandage', min: 2, max: 3 }],
      }),
    ],
  }),
} satisfies Record<string, ProfessionDef>;

export type ProfessionId = keyof typeof PROFESSIONS;

/**
 * Where gathering happens (request #43): the hex you stand on must have one of
 * these terrains. Crafting and services work anywhere for now (A82).
 */
export const GATHERING_TERRAIN: Partial<Record<ProfessionId, readonly Terrain[]>> = {
  fishing: ['river'],
  mining: ['mountain'],
  woodcutting: ['forest'],
  herbalism: ['forest', 'plains'],
  hunting: ['forest', 'plains'],
  farming: ['plains'],
};

/** Terrains a profession needs, or null when it can be practised anywhere. */
export function professionTerrains(id: string): readonly Terrain[] | null {
  return (GATHERING_TERRAIN as Record<string, readonly Terrain[]>)[id] ?? null;
}

export function getProfession(id: string): ProfessionDef | undefined {
  return (PROFESSIONS as Record<string, ProfessionDef>)[id];
}
