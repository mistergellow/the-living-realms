import { z } from 'zod';
import { attributesSchema, EQUIP_SLOTS, type CharacterSheetDto } from './api.js';
import { COMBAT_COLUMNS, STATUS_IDS } from './combat.js';

/* ---------------------------------------------------------------------------
 * Admin tools (request #41): testing controls for the project owner only.
 * Admins are listed in the server's ADMIN_EMAILS variable. Custom content
 * (items and abilities) is stored in the database and loaded into the
 * game-core content registry by the server and by every client.
 * ------------------------------------------------------------------------- */

export const ITEM_KINDS = ['weapon', 'offhand', 'armor', 'accessory'] as const;

const name = z.string().trim().min(1, 'Name is required.').max(48);
const description = z.string().trim().max(240).default('');
const amount = z.number().int().min(0).max(999);
const attributeBonus = z.number().int().min(-50).max(50);

/** A custom item definition (weapon, off-hand, armor or accessory). */
export const customItemInputSchema = z.object({
  name,
  description,
  kind: z.enum(ITEM_KINDS),
  slots: z.array(z.enum(EQUIP_SLOTS)).min(1).max(EQUIP_SLOTS.length),
  /** Catalogue weapon type (sword, axe, …) or shield/talisman. Gives the basic attack and art. */
  weaponType: z.string().max(32).optional(),
  /** Abilities granted while equipped (existing or custom ability ids). */
  abilities: z.array(z.string().max(64)).max(12).default([]),
  bonuses: z
    .object({
      might: attributeBonus,
      agility: attributeBonus,
      precision: attributeBonus,
      endurance: attributeBonus,
      intellect: attributeBonus,
      will: attributeBonus,
    })
    .partial()
    .default({}),
  armor: amount.default(0),
  magicResist: amount.default(0),
});
export type CustomItemInput = z.infer<typeof customItemInputSchema>;

const range = { min: amount, max: amount };
export const customAbilityEffectSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('damage'),
    damageType: z.enum(['physical', 'ranged', 'magic']),
    ...range,
    bonusVs: z
      .object({ status: z.enum(STATUS_IDS), multiplier: z.number().min(1).max(10) })
      .optional(),
  }),
  z.object({ kind: z.literal('heal'), ...range }),
  z.object({ kind: z.literal('block'), ...range }),
  z.object({
    kind: z.literal('status'),
    status: z.enum(STATUS_IDS),
    turns: z.number().int().min(1).max(10),
    value: z.number().int().min(0).max(999).optional(),
  }),
]);
export type CustomAbilityEffect = z.infer<typeof customAbilityEffectSchema>;

/** A custom ability ("power"). */
export const customAbilityInputSchema = z.object({
  name,
  description,
  /** 'weapon' = granted by items; 'skill' = learned (taught to a character). */
  source: z.enum(['weapon', 'skill']).default('skill'),
  focusCost: z.number().int().min(0).max(10),
  manaCost: z.number().int().min(0).max(100),
  targeting: z.object({
    side: z.enum(['enemy', 'ally', 'self']),
    reach: z.union([
      z.enum(['first', 'first2', 'any']),
      z.array(z.enum(COMBAT_COLUMNS)).min(1).max(3),
    ]),
    area: z.enum(['single', 'column', 'all']),
  }),
  effects: z.array(customAbilityEffectSchema).min(1, 'Add at least one effect.').max(6),
  /** Attribute weights (0–2 each), e.g. { might: 0.6, agility: 0.4 }. */
  scaling: z
    .object({
      might: z.number().min(0).max(2),
      agility: z.number().min(0).max(2),
      precision: z.number().min(0).max(2),
      endurance: z.number().min(0).max(2),
      intellect: z.number().min(0).max(2),
      will: z.number().min(0).max(2),
    })
    .partial()
    .default({}),
});
export type CustomAbilityInput = z.infer<typeof customAbilityInputSchema>;

export interface CustomItemDto extends CustomItemInput {
  id: string;
}
export interface CustomAbilityDto extends CustomAbilityInput {
  id: string;
}

/** Every custom definition; every client loads it into its content registry. */
export interface CustomContentDto {
  items: CustomItemDto[];
  abilities: CustomAbilityDto[];
}

// ---- Character tools ----
export interface AdminCharacterSummaryDto {
  id: string;
  name: string;
  accountEmail: string;
  reputation: number;
  inRift: boolean;
}
export interface AdminCharacterListResponse {
  characters: AdminCharacterSummaryDto[];
}

export interface AdminCharacterDto {
  sheet: CharacterSheetDto;
  /** Learned skills (can be forgotten); weapon and universal abilities are not listed here. */
  learnedSkillIds: string[];
  accountEmail: string;
}

export const adminGrantItemSchema = z.object({
  defId: z.string().min(1).max(64),
  upgradeLevel: z.number().int().min(0).max(10).default(0),
  quality: z.number().int().min(0).max(100).default(100),
});
export type AdminGrantItemRequest = z.input<typeof adminGrantItemSchema>;

export const adminUpdateItemSchema = z
  .object({
    upgradeLevel: z.number().int().min(0).max(10),
    quality: z.number().int().min(0).max(100),
  })
  .partial();
export type AdminUpdateItemRequest = z.infer<typeof adminUpdateItemSchema>;

export const adminTeachSkillSchema = z.object({ abilityId: z.string().min(1).max(64) });
export type AdminTeachSkillRequest = z.infer<typeof adminTeachSkillSchema>;

/** Overwrite base attributes, unspent points and reputation (any value, for testing). */
export const adminUpdateCharacterSchema = z
  .object({
    attributes: attributesSchema,
    attributePoints: z.number().int().min(0).max(999),
    reputation: z.number().int().min(0).max(1_000_000_000),
  })
  .partial();
export type AdminUpdateCharacterRequest = z.infer<typeof adminUpdateCharacterSchema>;
