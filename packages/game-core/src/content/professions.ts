import type { AttributeKey } from '@realms/shared';
import type { ItemDefId, MaterialId } from './items.js';
import type { Terrain } from './world-map.js';

/*
 * Professions (request #33, reworked by the Professions & Economy spec,
 * request #51 — see docs/PROFESSIONS_ARCHITECTURE.md).
 *
 * 15 professions: 5 gathering + 10 crafting. Every character can learn all of
 * them. Each has its own Mastery (6 ranks, Novice → Grandmaster). Mastery
 * points depend on the COMPLEXITY of what you do: simple work stops teaching
 * you anything once you are well above it, so cheap farming can never reach
 * Grandmaster. Mastery never changes combat attributes. BASE attributes give
 * a small, capped bonus (§21) that complements Mastery but never replaces it.
 *
 * Activities ("recipes") are data. ALL NUMBERS ARE PROVISIONAL — to be
 * balanced later.
 */

export type ProfessionCategory = 'gathering' | 'crafting';

// ---------------------------------------------------------------------------
// Mastery
// ---------------------------------------------------------------------------
export const MASTERY_RANKS = [
  'novice',
  'apprentice',
  'journeyman',
  'expert',
  'master',
  'grandmaster',
] as const;
export type MasteryRank = (typeof MASTERY_RANKS)[number];
export const MASTERY_RANK_NAMES: Record<MasteryRank, string> = {
  novice: 'Novice',
  apprentice: 'Apprentice',
  journeyman: 'Journeyman',
  expert: 'Expert',
  master: 'Master',
  grandmaster: 'Grandmaster',
};
/** Highest rank index (Grandmaster). */
export const MAX_RANK = MASTERY_RANKS.length - 1;
export const rankName = (rank: number) =>
  MASTERY_RANK_NAMES[MASTERY_RANKS[Math.max(0, Math.min(MAX_RANK, rank))]!];

export const MASTERY_RULES = {
  /** Mastery points to go from rank i to rank i + 1 (Novice → Apprentice first). */
  pointsToNext: [100, 250, 600, 1400, 3000] as readonly number[],
  /**
   * Share of an activity's points you still get, by how many ranks you are
   * above its complexity (complexity 1 = a Novice task): 0 → 100%, 1 → 50%,
   * 2 → 15%, 3 or more → nothing.
   */
  complexityFalloff: [1, 0.5, 0.15, 0] as readonly number[],
  /** Success chance per rank above the activity's required rank. */
  successPerRank: 10,
  maxChance: 95,
  minChance: 5,
  /** Each rank above the requirement: +15% chance of one extra item. */
  yieldPerRank: 15,
  /** Repairs: quality restored = repairBase + repairPerRank × rank. */
  repairBase: 15,
  repairPerRank: 8,
} as const;

// ---------------------------------------------------------------------------
// Tools (inventory items; see TOOLS in items.ts)
// ---------------------------------------------------------------------------
export type ToolType = 'fishing_rod' | 'axe' | 'pickaxe' | 'hunting_knife';
export const TOOL_TYPE_NAMES: Record<ToolType, string> = {
  fishing_rod: 'Fishing Rod',
  axe: 'Felling Axe',
  pickaxe: 'Pickaxe',
  hunting_knife: 'Hunting Knife',
};
export const TOOL_RULES = {
  /** Success bonus per tool tier above 1 (a tier-1 tool only makes the work possible). */
  chanceBonusPerTier: 5,
} as const;

// ---------------------------------------------------------------------------
// BASE attributes (§21) — configurable, applied by the server only.
// ---------------------------------------------------------------------------
export const PROFESSION_ATTRIBUTE_RULES = {
  /** BASE attribute value that gives no bonus (the starting value). */
  baseline: 5,
  /** Success % per weighted BASE point above the baseline. */
  perPoint: 1,
  /** The attribute bonus never exceeds this (one rank gives 10%). */
  cap: 8,
} as const;

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------
export interface ActivityDef {
  id: string;
  name: string;
  description: string;
  /** Mastery rank index needed to use it (0 = Novice). */
  rank: number;
  /** How demanding it is, 1–6 (1 = Novice work). Drives the Mastery it teaches. */
  complexity: number;
  /** Chance of success at the required rank (percent). */
  baseChance: number;
  /** Seconds before this profession can be practised again (until gathering uses AP, phase 2). */
  cooldownSeconds: number;
  /** Mastery points on success / on failure (before the complexity falloff). */
  points: number;
  failurePoints: number;
  /** Consumed on every attempt (success or failure). */
  inputs: Array<{ item: MaterialId; qty: number }>;
  /** Produced on success; ranks above the requirement add a chance of one extra. */
  outputs: Array<{ item: ItemDefId; min: number; max: number }>;
  /** Activities that work on one of your items. */
  effect?: 'repair';
}

export interface ProfessionDef {
  id: string;
  name: string;
  /** What a practitioner is called. */
  title: string;
  category: ProfessionCategory;
  description: string;
  /** Tool you must carry (in the bag) to practise it. */
  tool?: ToolType;
  /** §21: weights of the BASE attributes that help (they add up to 1). */
  attributes: Partial<Record<AttributeKey, number>>;
  activities: ActivityDef[];
}

const act = (
  a: Partial<ActivityDef> & Pick<ActivityDef, 'id' | 'name' | 'description'>,
): ActivityDef => {
  const rank = a.rank ?? 0;
  return {
    rank,
    complexity: rank + 1,
    baseChance: 70,
    cooldownSeconds: 20,
    points: 10,
    failurePoints: 4,
    inputs: [],
    outputs: [],
    ...a,
  };
};
const prof = (p: ProfessionDef) => p;

export const PROFESSIONS = {
  // ---- gathering ----
  hunting: prof({
    id: 'hunting',
    name: 'Hunting',
    title: 'Hunter',
    category: 'gathering',
    description: 'Track and hunt game for hides and meat.',
    tool: 'hunting_knife',
    attributes: { agility: 0.6, precision: 0.4 },
    activities: [
      act({
        id: 'hunt',
        name: 'Hunt',
        description: 'Track an animal through the woods.',
        baseChance: 55,
        points: 14,
        outputs: [
          { item: 'raw_hide', min: 1, max: 1 },
          { item: 'raw_meat', min: 1, max: 2 },
        ],
      }),
    ],
  }),
  fishing: prof({
    id: 'fishing',
    name: 'Fishing',
    title: 'Fisher',
    category: 'gathering',
    description: 'Catch fish in rivers and lakes.',
    tool: 'fishing_rod',
    attributes: { precision: 0.5, will: 0.5 },
    activities: [
      act({
        id: 'fish',
        name: 'Fish',
        description: 'Cast a line and wait.',
        outputs: [{ item: 'raw_fish', min: 1, max: 2 }],
      }),
    ],
  }),
  herbalism: prof({
    id: 'herbalism',
    name: 'Herbalism',
    title: 'Herbalist',
    category: 'gathering',
    description: 'Find medicinal plants and harvest grain and flax.',
    attributes: { intellect: 0.6, will: 0.4 },
    activities: [
      act({
        id: 'gather_herbs',
        name: 'Gather herbs',
        description: 'Search the ground for Rift Moss.',
        outputs: [{ item: 'herb', min: 1, max: 2 }],
      }),
      // Farming was merged into Herbalism (request #51).
      act({
        id: 'harvest_grain',
        name: 'Harvest grain',
        description: 'Reap a patch of wild grain.',
        baseChance: 80,
        outputs: [{ item: 'grain', min: 1, max: 3 }],
      }),
      act({
        id: 'harvest_flax',
        name: 'Harvest flax',
        description: 'Pull flax for its fibres.',
        outputs: [{ item: 'flax', min: 1, max: 2 }],
      }),
    ],
  }),
  woodcutting: prof({
    id: 'woodcutting',
    name: 'Woodcutting',
    title: 'Lumberjack',
    category: 'gathering',
    description: 'Fell trees for timber.',
    tool: 'axe',
    attributes: { might: 0.6, endurance: 0.4 },
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
  mining: prof({
    id: 'mining',
    name: 'Mining',
    title: 'Miner',
    category: 'gathering',
    description: 'Dig ore and gems out of the rock.',
    tool: 'pickaxe',
    attributes: { might: 0.5, endurance: 0.5 },
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
        rank: 1,
        baseChance: 40,
        points: 20,
        outputs: [{ item: 'rough_gem', min: 1, max: 1 }],
      }),
    ],
  }),

  // ---- crafting ----
  crafter: prof({
    id: 'crafter',
    name: 'Crafting',
    title: 'Crafter',
    category: 'crafting',
    description: 'General crafting: the tools every gatherer needs.',
    attributes: { precision: 0.5, intellect: 0.5 },
    activities: [
      act({
        id: 'make_fishing_rod',
        name: 'Make a fishing rod',
        description: 'A plank shaft and a linen line.',
        inputs: [
          { item: 'plank', qty: 2 },
          { item: 'linen', qty: 1 },
        ],
        outputs: [{ item: 'fishing_rod', min: 1, max: 1 }],
      }),
      act({
        id: 'make_felling_axe',
        name: 'Make a felling axe',
        description: 'An iron head on a wooden haft.',
        inputs: [
          { item: 'iron_ingot', qty: 1 },
          { item: 'plank', qty: 1 },
        ],
        outputs: [{ item: 'felling_axe', min: 1, max: 1 }],
      }),
      act({
        id: 'make_pickaxe',
        name: 'Make a pickaxe',
        description: 'An iron pick on a wooden haft.',
        inputs: [
          { item: 'iron_ingot', qty: 1 },
          { item: 'plank', qty: 1 },
        ],
        outputs: [{ item: 'pickaxe', min: 1, max: 1 }],
      }),
      act({
        id: 'make_hunting_knife',
        name: 'Make a hunting knife',
        description: 'An iron blade with a leather grip.',
        inputs: [
          { item: 'iron_ingot', qty: 1 },
          { item: 'leather', qty: 1 },
        ],
        outputs: [{ item: 'hunting_knife', min: 1, max: 1 }],
      }),
      act({
        id: 'make_fine_fishing_rod',
        name: 'Make a fine fishing rod',
        description: 'Balanced and strong. Needs an Apprentice Fisher.',
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
        inputs: [
          { item: 'plank', qty: 3 },
          { item: 'linen', qty: 2 },
        ],
        outputs: [{ item: 'fine_fishing_rod', min: 1, max: 1 }],
      }),
      act({
        id: 'make_fine_felling_axe',
        name: 'Make a fine felling axe',
        description: 'A tempered head. Needs an Apprentice Lumberjack.',
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
        inputs: [
          { item: 'iron_ingot', qty: 3 },
          { item: 'plank', qty: 2 },
        ],
        outputs: [{ item: 'fine_felling_axe', min: 1, max: 1 }],
      }),
      act({
        id: 'make_fine_pickaxe',
        name: 'Make a fine pickaxe',
        description: 'A hardened pick. Needs an Apprentice Miner.',
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
        inputs: [
          { item: 'iron_ingot', qty: 3 },
          { item: 'plank', qty: 2 },
        ],
        outputs: [{ item: 'fine_pickaxe', min: 1, max: 1 }],
      }),
      act({
        id: 'make_fine_hunting_knife',
        name: 'Make a fine hunting knife',
        description: 'A keen skinning blade. Needs an Apprentice Hunter.',
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
        inputs: [
          { item: 'iron_ingot', qty: 2 },
          { item: 'leather', qty: 2 },
        ],
        outputs: [{ item: 'fine_hunting_knife', min: 1, max: 1 }],
      }),
    ],
  }),
  blacksmith: prof({
    id: 'blacksmith',
    name: 'Blacksmithing',
    title: 'Blacksmith',
    category: 'crafting',
    description: 'Smelt metal and repair gear.',
    attributes: { might: 0.6, endurance: 0.4 },
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
      // Weapon upgrades are at the city blacksmith (request #50, Metin2 style).
    ],
  }),
  runecrafter: prof({
    id: 'runecrafter',
    name: 'Runecrafting',
    title: 'Runecrafter',
    category: 'crafting',
    description: 'Shape rune stones. Runes and rune slots come in a later update.',
    attributes: { intellect: 0.6, will: 0.4 },
    activities: [
      act({
        id: 'shape_rune_stone',
        name: 'Shape a rune stone',
        description: 'Grind a gem into a blank rune stone.',
        baseChance: 50,
        points: 20,
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
    description: 'Work wood into planks and shields.',
    attributes: { precision: 0.6, might: 0.4 },
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
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
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
    attributes: { agility: 0.5, precision: 0.5 },
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
        baseChance: 60,
        points: 16,
        inputs: [{ item: 'leather', qty: 2 }],
        outputs: [{ item: 'leather_cap', min: 1, max: 1 }],
      }),
      act({
        id: 'craft_boots',
        name: 'Make leather boots',
        description: 'Sturdy boots for the road.',
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
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
    description: 'Weave cloth, sew clothing and cut bandages.',
    attributes: { agility: 0.6, precision: 0.4 },
    activities: [
      act({
        id: 'weave_linen',
        name: 'Weave linen',
        description: 'Two flax make one linen.',
        inputs: [{ item: 'flax', qty: 2 }],
        outputs: [{ item: 'linen', min: 1, max: 1 }],
      }),
      // Medicine was merged into Tailoring (request #51).
      act({
        id: 'make_bandages',
        name: 'Make bandages',
        description: 'Cut linen into bandages.',
        baseChance: 80,
        inputs: [{ item: 'linen', qty: 1 }],
        outputs: [{ item: 'bandage', min: 2, max: 3 }],
      }),
      act({
        id: 'sew_tunic',
        name: 'Sew a padded tunic',
        description: 'Quilted body armour.',
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
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
    attributes: { precision: 0.7, agility: 0.3 },
    activities: [
      act({
        id: 'cut_gem',
        name: 'Cut a gem',
        description: 'Polish a rough gem.',
        baseChance: 55,
        points: 15,
        inputs: [{ item: 'rough_gem', qty: 1 }],
        outputs: [{ item: 'cut_gem', min: 1, max: 1 }],
      }),
      act({
        id: 'craft_ring',
        name: 'Make a Ring of Vigor',
        description: 'A gem set in iron.',
        rank: 1,
        baseChance: 50,
        points: 35,
        failurePoints: 10,
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
    attributes: { intellect: 0.7, will: 0.3 },
    activities: [
      act({
        id: 'brew_healing',
        name: 'Brew a healing draught',
        description: 'Two herbs, boiled down.',
        baseChance: 60,
        points: 15,
        inputs: [{ item: 'herb', qty: 2 }],
        outputs: [{ item: 'healing_draught', min: 1, max: 1 }],
      }),
      act({
        id: 'brew_mana',
        name: 'Brew a mana tonic',
        description: 'Three herbs, distilled.',
        rank: 1,
        baseChance: 60,
        points: 22,
        failurePoints: 8,
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
    attributes: { will: 0.5, intellect: 0.5 },
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
        baseChance: 65,
        points: 15,
        inputs: [
          { item: 'raw_meat', qty: 1 },
          { item: 'grain', qty: 1 },
        ],
        outputs: [{ item: 'hearty_stew', min: 1, max: 1 }],
      }),
    ],
  }),
  scribing: prof({
    id: 'scribing',
    name: 'Scribing',
    title: 'Scribe',
    category: 'crafting',
    description: 'Make parchment and ink and write scrolls. Copying books comes later.',
    attributes: { intellect: 0.6, precision: 0.4 },
    activities: [
      act({
        id: 'make_parchment',
        name: 'Make parchment',
        description: 'Scrape and stretch leather into parchment.',
        inputs: [{ item: 'leather', qty: 1 }],
        outputs: [{ item: 'parchment', min: 2, max: 2 }],
      }),
      act({
        id: 'mix_ink',
        name: 'Mix ink',
        description: 'Crush herbs into a dark ink.',
        baseChance: 75,
        inputs: [{ item: 'herb', qty: 1 }],
        outputs: [{ item: 'ink', min: 1, max: 2 }],
      }),
      act({
        id: 'scribe_blank_scroll',
        name: 'Prepare a blank scroll',
        description: 'Ruled parchment, ready for words of power.',
        rank: 1,
        baseChance: 60,
        points: 25,
        failurePoints: 8,
        inputs: [
          { item: 'parchment', qty: 1 },
          { item: 'ink', qty: 1 },
        ],
        outputs: [{ item: 'blank_scroll', min: 1, max: 1 }],
      }),
    ],
  }),
} satisfies Record<string, ProfessionDef>;

export type ProfessionId = keyof typeof PROFESSIONS;

/**
 * Old profession ids (request #33) → their profession now (request #51). The
 * database migration 0016 applies the same mapping.
 */
export const RENAMED_PROFESSIONS: Record<string, ProfessionId> = {
  blacksmithing: 'blacksmith',
  runesmithing: 'runecrafter',
  farming: 'herbalism',
  medicine: 'tailoring',
};

/**
 * Where gathering happens (request #43): the hex you stand on must have one of
 * these terrains. Crafting works anywhere for now (A82).
 */
export const GATHERING_TERRAIN: Partial<Record<ProfessionId, readonly Terrain[]>> = {
  fishing: ['river'],
  mining: ['mountain'],
  woodcutting: ['forest'],
  herbalism: ['forest', 'plains'],
  hunting: ['forest', 'plains'],
};

/** Terrains a profession needs, or null when it can be practised anywhere. */
export function professionTerrains(id: string): readonly Terrain[] | null {
  return (GATHERING_TERRAIN as Record<string, readonly Terrain[]>)[id] ?? null;
}

export function getProfession(id: string): ProfessionDef | undefined {
  return (PROFESSIONS as Record<string, ProfessionDef>)[id];
}

/** Materials a profession gathers or works with (for the profession screen). */
export function professionResources(p: ProfessionDef): ItemDefId[] {
  const out = new Set<string>();
  for (const a of p.activities) {
    if (p.category === 'gathering') for (const o of a.outputs) out.add(o.item);
    else for (const i of a.inputs) out.add(i.item);
  }
  return [...out] as ItemDefId[];
}
