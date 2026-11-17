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

export const characterAppearanceSchema = z.object({
  version: z.literal(1),
  color: z.enum(APPEARANCE_COLORS),
  emblem: z.enum(APPEARANCE_EMBLEMS),
});
export type CharacterAppearance = z.infer<typeof characterAppearanceSchema>;

export const createCharacterRequestSchema = z.object({
  name: z.string(),
  appearance: characterAppearanceSchema,
});
export type CreateCharacterRequest = z.infer<typeof createCharacterRequestSchema>;

export interface CharacterListResponse {
  characters: CharacterDto[];
  limit: number;
}
