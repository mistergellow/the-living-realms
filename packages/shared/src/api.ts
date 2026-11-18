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
  'vitality',
  'arcana',
  'spirit',
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
export type Attributes = Record<AttributeKey, number>;

const attributeScore = z.number().int().min(0).max(99);
export const attributesSchema = z
  .object({
    might: attributeScore,
    agility: attributeScore,
    precision: attributeScore,
    vitality: attributeScore,
    arcana: attributeScore,
    spirit: attributeScore,
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
export const EQUIP_SLOTS = [
  'mainHand',
  'offHand',
  'head',
  'body',
  'legs',
  'accessory1',
  'accessory2',
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export type ItemKind = 'weapon' | 'offhand' | 'armor' | 'accessory';

export interface ItemDto {
  id: string;
  defId: string;
  name: string;
  kind: ItemKind;
  description: string;
  /** Item quality/durability, 0–100. At 0 the item is broken and unusable. */
  quality: number;
  broken: boolean;
  equippedSlot: EquipSlot | null;
  /** Slots this item can be equipped in. */
  slots: EquipSlot[];
  twoHanded: boolean;
  bonuses: Partial<Attributes>;
  armor: number;
  magicResist: number;
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
  abilities: AbilityDto[];
  /** Reputation is a per-character currency earned through activities. */
  reputation: number;
  /** Attribute points not yet distributed. */
  attributePoints: number;
}

export const equipRequestSchema = z.object({ itemId: z.uuid(), slot: z.enum(EQUIP_SLOTS) });
export type EquipRequest = z.infer<typeof equipRequestSchema>;
export const unequipRequestSchema = z.object({ slot: z.enum(EQUIP_SLOTS) });
export type UnequipRequest = z.infer<typeof unequipRequestSchema>;
