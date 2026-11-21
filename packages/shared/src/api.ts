import { z } from 'zod';

/* ---------------------------------------------------------------------------
 * HTTP API contracts. Request schemas are validated on the server; response
 * types are consumed by the web client. Keep this file free of runtime deps
 * other than zod so both sides can import it.
 * ------------------------------------------------------------------------- */

// ---- Auth ----
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX)
  .pipe(z.email({ message: 'Enter a valid email address.' }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters.`);

export const registerRequestSchema = z.object({ email: emailSchema, password: passwordSchema });
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export interface AccountDto {
  id: string;
  email: string;
  createdAt: string;
}
export interface MeResponse {
  account: AccountDto;
}

// ---- World / hex coordinates ----
export interface HexCoord {
  q: number;
  r: number;
}

export interface WorldDto {
  id: string;
  slug: string;
  name: string;
  tick: number;
  lastTickAt: string | null;
}

// ---- Characters ----
export interface CharacterDto {
  id: string;
  name: string;
  appearance: CharacterAppearance;
  position: HexCoord;
  createdAt: string;
  lastPlayedAt: string | null;
}

/**
 * Placeholder appearance (phase 1). Versioned so it can evolve into a richer
 * model later without breaking stored characters.
 */
export const APPEARANCE_COLORS = [
  '#c0392b',
  '#d35400',
  '#d4ac0d',
  '#27ae60',
  '#16a085',
  '#2e86c1',
  '#7d3c98',
  '#839192',
] as const;
export const APPEARANCE_EMBLEMS = [
  'circle',
  'square',
  'diamond',
  'triangle',
  'star',
  'cross',
  'crescent',
  'shield',
] as const;
export type AppearanceEmblem = (typeof APPEARANCE_EMBLEMS)[number];

/** v1 (phase 1 placeholder): a colored emblem token. Still accepted for old characters. */
export const appearanceV1Schema = z.object({
  version: z.literal(1),
  color: z.enum(APPEARANCE_COLORS),
  emblem: z.enum(APPEARANCE_EMBLEMS),
});

/*
 * v2: editable base body (decision D32), rendered as a layered illustrated
 * character. Equipment layers will be drawn on top in a later phase.
 * Option lists are PROVISIONAL (A21).
 */
export const BODY_TYPES = ['sturdy', 'slender'] as const;
export const SKIN_TONES = [
  '#f7d9bf',
  '#ecc19c',
  '#d49c73',
  '#b07650',
  '#8a5636',
  '#5e3b25',
] as const;
export const HAIR_STYLES = ['short', 'long', 'ponytail', 'spiky', 'bun', 'shaved'] as const;
export const HAIR_COLORS = [
  '#2b211a',
  '#5a3a22',
  '#a3672f',
  '#dcb56c',
  '#e9e5dc',
  '#b8392f',
  '#3d5a80',
  '#6b4c9a',
] as const;
export const EYE_COLORS = [
  '#3b2a1a',
  '#2e86c1',
  '#27ae60',
  '#a07a2c',
  '#7d3c98',
  '#b8392f',
] as const;

export const appearanceV2Schema = z.object({
  version: z.literal(2),
  body: z.enum(BODY_TYPES),
  skin: z.enum(SKIN_TONES),
  hairStyle: z.enum(HAIR_STYLES),
  hairColor: z.enum(HAIR_COLORS),
  eyeColor: z.enum(EYE_COLORS),
  /** Base clothing color. */
  outfit: z.enum(APPEARANCE_COLORS),
});
export type AppearanceV2 = z.infer<typeof appearanceV2Schema>;

export const characterAppearanceSchema = z.discriminatedUnion('version', [
  appearanceV1Schema,
  appearanceV2Schema,
]);
export type CharacterAppearance = z.infer<typeof characterAppearanceSchema>;

export const DEFAULT_APPEARANCE: AppearanceV2 = {
  version: 2,
  body: 'sturdy',
  skin: SKIN_TONES[1],
  hairStyle: 'short',
  hairColor: HAIR_COLORS[1],
  eyeColor: EYE_COLORS[0],
  outfit: APPEARANCE_COLORS[5],
};

/** Any stored appearance as v2 (v1 characters keep their color as outfit). */
export function normalizeAppearance(a: CharacterAppearance | null | undefined): AppearanceV2 {
  if (!a) return DEFAULT_APPEARANCE;
  if (a.version === 2) return a;
  return { ...DEFAULT_APPEARANCE, outfit: a.color };
}

// ---- Attributes (decision D33: six linear attributes, replacing D&D) ----
export const ATTRIBUTE_KEYS = [
  'might',
  'agility',
  'precision',
  'endurance',
  'intellect',
  'will',
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
export type Attributes = Record<AttributeKey, number>;

const attributeScore = z.number().int().min(0).max(99);
export const attributesSchema = z
  .object({
    might: attributeScore,
    agility: attributeScore,
    precision: attributeScore,
    endurance: attributeScore,
    intellect: attributeScore,
    will: attributeScore,
  })
  .strict();

export const createCharacterRequestSchema = z.object({
  name: z.string(),
  appearance: characterAppearanceSchema,
  /** Final scores after distributing creation points; validated by game-core rules. */
  attributes: attributesSchema,
  /** Item definition id of the chosen starter weapon. */
  startingWeapon: z.string().max(64),
  /** Optional starter off-hand (only with one-handed weapons). */
  startingOffhand: z.string().max(64).optional(),
});
export type CreateCharacterRequest = z.infer<typeof createCharacterRequestSchema>;

/** Spend unspent attribute points (e.g. characters converted from the old system). */
export const allocateAttributesRequestSchema = z.object({ add: attributesSchema.partial() });
export type AllocateAttributesRequest = z.infer<typeof allocateAttributesRequestSchema>;

export interface CharacterListResponse {
  characters: CharacterDto[];
  limit: number;
}

// ---- Character sheet: equipment, items, abilities, derived stats ----
/** Equipment slots (request #36): hands, head, body, boots, two rings, pendant. */
export const EQUIP_SLOTS = [
  'mainHand',
  'offHand',
  'head',
  'body',
  'feet',
  'ring1',
  'ring2',
  'pendant',
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/** 'material' and 'consumable' come from professions (request #33); they stack. */
export type ItemKind = 'weapon' | 'offhand' | 'armor' | 'accessory' | 'material' | 'consumable';

/** Skills prepared for combat (request #36): 8, plus weapon abilities, Block and Swap. */
export const MAX_PREPARED_SKILLS = 8;

export interface ItemDto {
  id: string;
  defId: string;
  name: string;
  kind: ItemKind;
  description: string;
  /** Item quality/durability, 0–100. At 0 the item is broken and unusable. */
  quality: number;
  /** Stack size (materials and consumables; 1 for gear). */
  quantity: number;
  broken: boolean;
  equippedSlot: EquipSlot | null;
  /** Slots this item can be equipped in. */
  slots: EquipSlot[];
  twoHanded: boolean;
  bonuses: Partial<Attributes>;
  armor: number;
  magicResist: number;
  /** Weapons only (request #31): type, base stats, upgrades, specials, rune slots. */
  weapon: WeaponInfoDto | null;
  /** Names of the abilities this item grants while equipped (weapons, off-hands). */
  grantsAbilities: string[];
}

/** A special property on a weapon (max 5). Catalogue of specials: future. */
export interface WeaponSpecial {
  id: string;
  value?: number;
}

/** A rune slot (max 2). Locked by default; the Runemaster NPC unlocks them (future). */
export interface WeaponRuneSlot {
  unlocked: boolean;
  runeId: string | null;
}

export interface WeaponInfoDto {
  type: string;
  typeName: string;
  hands: 1 | 2;
  category: 'melee' | 'ranged' | 'magic';
  primaryAttribute: AttributeKey;
  secondaryAttribute: AttributeKey | null;
  attackType: 'physical' | 'ranged' | 'magic';
  attackStyle: string;
  identity: string;
  /** Basic attack damage at this upgrade level (before attribute scaling). */
  baseDamage: { min: number; max: number };
  basicAttackId: string;
  /** Focus cost of the basic attack (heavy weapons 3, daggers 1). */
  basicAttackCost: number;
  /** +0, +1, +2 … */
  upgradeLevel: number;
  specials: WeaponSpecial[];
  maxSpecials: number;
  runeSlots: WeaponRuneSlot[];
}

export type AbilitySource = 'weapon' | 'skill' | 'universal' | 'enemy';

export interface AbilityDto {
  id: string;
  name: string;
  description: string;
  source: AbilitySource;
  /** Name of the item granting it (weapon abilities). */
  grantedBy: string | null;
  focusCost: number;
  manaCost: number;
  /** Human-readable targeting summary, e.g. "One enemy · front row". */
  targeting: string;
  /** Human-readable effects, e.g. "6–8 physical damage", "Bleed 3 for 2 turns". */
  effects: string[];
  /** Attributes it scales with, e.g. "Might 60% · Agility 40%". */
  scaling: string;
}

export interface DerivedStatsDto {
  maxHp: number;
  maxMana: number;
  /** Physical mitigation rating; reduction = armor / (armor + K). */
  armor: number;
  /** Magic mitigation rating; same curve as armor. */
  magicResist: number;
  /** Percent damage reduction shown to players (derived from the ratings). */
  physicalReduction: number;
  magicReduction: number;
  initiative: number;
  /** Percentages. */
  dodgeChance: number;
  critChance: number;
  /** Damage of a critical hit, percent of normal (e.g. 170). */
  critDamage: number;
  /** Bonus percent to healing done. */
  healingPower: number;
  /** Bonus percent to healing received. */
  healingReceived: number;
  manaRegen: number;
  /** Bonus percent to status effects (bleed, burn, …) applied. */
  effectPotency: number;
  /** Focus generated at the start of every combat round (Precision). */
  focusPerRound: number;
}

export interface CharacterSheetDto {
  character: CharacterDto;
  baseAttributes: Attributes;
  /** Base + equipment bonuses. */
  attributes: Attributes;
  stats: DerivedStatsDto;
  equipment: Record<EquipSlot, ItemDto | null>;
  /** Unequipped items. */
  inventory: ItemDto[];
  /** Everything usable in combat: weapon abilities + prepared skills + Block/Swap. */
  abilities: AbilityDto[];
  /** All skills the character has learned (from books), prepared or not. */
  learnedSkills: AbilityDto[];
  /** The prepared skills, by loadout slot (length MAX_PREPARED_SKILLS; null = empty). */
  loadout: Array<string | null>;
  /** Reputation is a per-character currency earned through activities. */
  reputation: number;
  /** Attribute points not yet distributed. */
  attributePoints: number;
}

export const equipRequestSchema = z.object({ itemId: z.uuid(), slot: z.enum(EQUIP_SLOTS) });
export type EquipRequest = z.infer<typeof equipRequestSchema>;
export const unequipRequestSchema = z.object({ slot: z.enum(EQUIP_SLOTS) });
export type UnequipRequest = z.infer<typeof unequipRequestSchema>;

/** Replace the prepared skills; each entry is a learned skill id or null (empty slot). */
export const loadoutRequestSchema = z.object({
  slots: z.array(z.string().max(64).nullable()).length(MAX_PREPARED_SKILLS),
});
export type LoadoutRequest = z.infer<typeof loadoutRequestSchema>;
