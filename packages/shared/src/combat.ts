import { z } from 'zod';
import type { Attributes, CharacterAppearance, DerivedStatsDto } from './api.js';

/* ---------------------------------------------------------------------------
 * Combat and Rift contracts.
 *
 * Battlefield (decision D13): each side has 6 slots in 2 rows of 3.
 * Slots 0–2 = front row, 3–5 = back row.
 * ------------------------------------------------------------------------- */

export const SLOTS_PER_SIDE = 6;
export type CombatSide = 'party' | 'enemies';
export type CombatRow = 'front' | 'back';

export const STATUS_IDS = ['bleed', 'burn', 'mark', 'weaken', 'stun'] as const;
export type StatusId = (typeof STATUS_IDS)[number];

export interface StatusView {
  id: StatusId;
  /** Turns left (counted at the start of the affected unit's turns). */
  turns: number;
  /** Damage per tick for bleed/burn. */
  value: number;
}

/** What an enemy plans to do this round (shown to players, Slay-the-Spire style). */
export interface IntentView {
  abilityId: string;
  targetIds: string[];
}

export interface CombatantView {
  id: string;
  side: CombatSide;
  kind: 'player' | 'enemy';
  name: string;
  /** Player characters only. */
  characterId: string | null;
  appearance: CharacterAppearance | null;
  /** Enemy definition id (for enemy art). */
  enemyDefId: string | null;
  slot: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  focus: number;
  /** Absorbs damage until the unit's next turn (Slay-the-Spire style). */
  block: number;
  statuses: StatusView[];
  /** Player characters only (used for ability scaling). */
  attributes: Attributes | null;
  /** Enemies only: damage multiplier. */
  power: number;
  /** Enemies only: planned actions for their next turn (D36). */
  intents: IntentView[];
  downed: boolean;
  isBoss: boolean;
  abilityIds: string[];
  stats: DerivedStatsDto;
}

export type CombatLogEntry =
  | { t: 'round'; round: number }
  | { t: 'turn'; actorId: string }
  | { t: 'ability'; actorId: string; abilityId: string; targetIds: string[] }
  | { t: 'damage'; targetId: string; amount: number; crit: boolean; blocked: number }
  | { t: 'block'; targetId: string; amount: number }
  | { t: 'status'; targetId: string; status: StatusId; turns: number }
  | { t: 'tick'; targetId: string; status: StatusId; amount: number }
  | { t: 'stunned'; targetId: string }
  | { t: 'dodge'; targetId: string }
  | { t: 'heal'; targetId: string; amount: number }
  | { t: 'swap'; actorId: string; fromSlot: number; toSlot: number; withId: string | null }
  | { t: 'downed'; targetId: string }
  | { t: 'revived'; targetId: string; hp: number }
  | { t: 'timeout'; actorId: string }
  | { t: 'room'; outcome: 'cleared' | 'wiped' };

export type CombatPhase = 'party' | 'enemies' | 'room_cleared' | 'ended';

export interface CombatView {
  round: number;
  phase: CombatPhase;
  /** Whose turn it is (party phase). */
  activeId: string | null;
  /** Party turn order this round (by initiative). */
  turnOrder: string[];
  combatants: CombatantView[];
  outcome: 'victory' | 'defeat' | null;
  /** Most recent entries last. Each entry has a sequence number. */
  log: Array<CombatLogEntry & { seq: number }>;
}

export interface RiftRoomDto {
  name: string;
  isBoss: boolean;
}

export interface RiftDto {
  id: string;
  name: string;
  description: string;
  rooms: RiftRoomDto[];
}

export type RunStatus = 'active' | 'victory' | 'defeat' | 'abandoned';

export interface RunRewardsDto {
  reputation: number;
  items: Array<{ id: string; name: string }>;
}

export interface RunPenaltyDto {
  /** Equipped items that lost quality. */
  damaged: Array<{ id: string; name: string; quality: number; broken: boolean }>;
}

export interface RunDto {
  id: string;
  riftId: string;
  riftName: string;
  status: RunStatus;
  roomIndex: number;
  rooms: RiftRoomDto[];
  combat: CombatView;
  /** ISO time the current player turn ends (60 s per turn, decision D16). */
  turnDeadline: string | null;
  /** Filled when the run ended (for the character that asked). */
  rewards: RunRewardsDto | null;
  penalty: RunPenaltyDto | null;
}

export const startRunRequestSchema = z.object({ characterId: z.uuid() });
export type StartRunRequest = z.infer<typeof startRunRequestSchema>;

export const combatActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ability'),
    abilityId: z.string().max(64),
    /** Target unit (single / row abilities). */
    targetId: z.string().max(64).optional(),
    /** Destination slot (Swap Position). */
    targetSlot: z
      .number()
      .int()
      .min(0)
      .max(SLOTS_PER_SIDE - 1)
      .optional(),
  }),
  z.object({ type: z.literal('end_turn') }),
  /** After a room is cleared: enter the next room. */
  z.object({ type: z.literal('advance') }),
  /** Leave the Rift. Counts as a defeat (equipment loses quality). */
  z.object({ type: z.literal('abandon') }),
]);
export type CombatAction = z.infer<typeof combatActionSchema>;

export const runActionRequestSchema = z.object({
  characterId: z.uuid(),
  action: combatActionSchema,
});
export type RunActionRequest = z.infer<typeof runActionRequestSchema>;
