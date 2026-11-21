import { z } from 'zod';
import type {
  AttributeKey,
  Attributes,
  CharacterAppearance,
  HexCoord,
  DerivedStatsDto,
  GearCombatEffects,
} from './api.js';

/* ---------------------------------------------------------------------------
 * Combat and Rift contracts.
 *
 * Battlefield (owner, request #35 — replaces the 3 × 2 formation of D38):
 * each side stands in ONE LINE of 4 positions, like Darkest Dungeon.
 * Slot 0 = front (nearest the enemy), 1 = second, 2 = third, 3 = back.
 * A "column" in the code is one of these positions.
 * ------------------------------------------------------------------------- */

export const SLOTS_PER_SIDE = 4;
export type CombatSide = 'party' | 'enemies';
export const COMBAT_COLUMNS = ['front', 'second', 'third', 'back'] as const;
export type CombatColumn = (typeof COMBAT_COLUMNS)[number];
/** Position name of a slot (0 front … 3 back). */
export const columnOfSlot = (slot: number): CombatColumn =>
  COMBAT_COLUMNS[Math.max(0, Math.min(SLOTS_PER_SIDE - 1, slot))]!;
/** Kept for drawing order; everyone stands on one line now. */
export const lineOfSlot = (_slot: number) => 0;

/**
 * Statuses (request #44 adds strength, thorns, intangible, ritual and fuse,
 * the mechanics of the new enemies). Shown as icons, Slay-the-Spire style.
 */
export const STATUS_IDS = [
  'bleed',
  'burn',
  'mark',
  'weaken',
  'stun',
  'strength',
  'thorns',
  'intangible',
  'ritual',
  'fuse',
  // request #47
  'regen',
] as const;
export type StatusId = (typeof STATUS_IDS)[number];

export interface StatusView {
  id: StatusId;
  /** Rounds left (counted down at the start of every round). */
  turns: number;
  /**
   * Bleed/burn: damage per tick; strength: extra damage per hit; thorns:
   * damage back to attackers; ritual: strength gained per round; fuse:
   * explosion damage when it runs out.
   */
  value: number;
}

/** What an enemy plans to do this round (shown to players, Slay-the-Spire style). */
export interface IntentView {
  abilityId: string;
  targetIds: string[];
  /** Column targeted by column attacks (D41). */
  column: CombatColumn | null;
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
  /** Focus gained at the start of every round (from Precision). */
  focusPerRound: number;
  /** Player left the run early (group runs, A28). */
  left: boolean;
  /** Absorbs damage before HP; stacks; removed at the start of every round. */
  block: number;
  /** Stunned at the start of this round: cannot act this round. */
  stunned: boolean;
  statuses: StatusView[];
  /** Player characters only (used for ability scaling). */
  attributes: Attributes | null;
  /** Enemies only: damage multiplier. */
  power: number;
  /** Multiplier on ability values per ability id (weapon upgrades +1, +2…). */
  abilityMultipliers: Record<string, number>;
  /** Enemies only: planned actions for this round (D36). */
  intents: IntentView[];
  downed: boolean;
  isBoss: boolean;
  abilityIds: string[];
  stats: DerivedStatsDto;
  /** Player characters: combat bonuses from gear effects (request #37). */
  gear?: GearCombatEffects;
}

export type CombatLogEntry =
  | { t: 'round'; round: number }
  /** Team initiative: highest (roll + Agility) of each side; `first` acts first. */
  | { t: 'initiative'; party: number; enemies: number; first: CombatSide }
  /** The resolution phase starts (actions alternate between teams). */
  | { t: 'resolve'; first: CombatSide }
  /** A planned action did not happen (actor down/stunned, not enough Focus, no target). */
  | { t: 'skipped'; actorId: string; abilityId: string; reason: string }
  | { t: 'ability'; actorId: string; abilityId: string; targetIds: string[] }
  | { t: 'damage'; targetId: string; amount: number; crit: boolean; blocked: number }
  | { t: 'block'; targetId: string; amount: number }
  | { t: 'status'; targetId: string; status: StatusId; turns: number }
  | { t: 'tick'; targetId: string; status: StatusId; amount: number }
  | { t: 'stunned'; targetId: string }
  | { t: 'left'; actorId: string }
  | { t: 'heal'; targetId: string; amount: number }
  | { t: 'swap'; actorId: string; fromSlot: number; toSlot: number; withId: string | null }
  | { t: 'downed'; targetId: string }
  | { t: 'revived'; targetId: string; hp: number }
  | { t: 'timeout'; actorId: string | null }
  | { t: 'room'; outcome: 'cleared' | 'wiped' }
  /** A unit called another into the fight (request #44). */
  | { t: 'summon'; actorId: string; unitId: string }
  /** A unit's fuse ran out: it explodes, hurting the other side (request #44). */
  | { t: 'explode'; actorId: string };

/**
 * Round structure (combat spec, request #31): `planning` = players choose
 * their actions; the resolution runs on the server right after everyone is
 * ready (or the timer ends) and the next round starts in `planning` again.
 */
export type CombatPhase = 'planning' | 'room_cleared' | 'ended';

/** An action a player planned this round (resolved in planned order, D-request #31). */
export interface PlannedActionView {
  id: number;
  actorId: string;
  abilityId: string;
  targetId?: string;
  targetColumn?: CombatColumn;
  targetSlot?: number;
}

export interface InitiativeView {
  party: number;
  enemies: number;
  first: CombatSide;
}

export interface CombatView {
  round: number;
  phase: CombatPhase;
  /** This round's team initiative (who starts the resolution). */
  initiative: InitiativeView | null;
  /** The party's planned actions, in the order they will be resolved. */
  plan: PlannedActionView[];
  /** Party members who confirmed their plan this round. */
  ready: string[];
  combatants: CombatantView[];
  outcome: 'victory' | 'defeat' | null;
  /** Most recent entries last. Each entry has a sequence number. */
  log: Array<CombatLogEntry & { seq: number }>;
}

// ---------------------------------------------------------------------------
// The Rift: dungeon exploration (request #31). A run is a branching map
// (Slay-the-Spire style) of rooms; combat is one kind of room.
// ---------------------------------------------------------------------------

export const ROOM_TYPES = [
  'combat',
  'elite',
  'campsite',
  'event',
  'loot',
  'secret',
  'boss',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export interface RiftDto {
  id: string;
  name: string;
  description: string;
  /** Rooms on any path from the entrance to the boss (boss included). */
  depth: number;
  bossName: string;
  /** Map entrance (request #43): difficulty tier and hex; null on templates. */
  tier: number | null;
  site: HexCoord | null;
}

export interface MapNodeDto {
  id: string;
  /** 0 = first row; the boss is on the last row. */
  row: number;
  /** Horizontal lane (for drawing). */
  col: number;
  type: RoomType;
  visited: boolean;
  current: boolean;
  /** Can be chosen as the next room right now. */
  available: boolean;
  /** A secret room the party found (hidden rooms are never sent). */
  secret: boolean;
}

export interface MapDto {
  rows: number;
  cols: number;
  nodes: MapNodeDto[];
  /** Connections [from, to] (always from a row to a later row). */
  edges: Array<[string, string]>;
}

/** A lasting effect from exploration (debuff or advantage), shown between rooms. */
export interface ConditionView {
  id: string;
  name: string;
  description: string;
  kind: 'debuff' | 'boon';
  /** Rooms it still lasts (null = until removed, e.g. at a Campsite). */
  rooms: number | null;
}

export interface RunMemberDto {
  characterId: string;
  name: string;
  appearance: CharacterAppearance;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  /** BASE attributes (no equipment, no buffs): the only values used in exploration tests. */
  baseAttributes: Attributes;
  conditions: ConditionView[];
  left: boolean;
  /** PvP: 'party' = team A, 'enemies' = team B; null in a Rift. */
  team: CombatSide | null;
}

export interface VoteView {
  characterId: string;
  optionId: string;
  /** Events: who attempts the chosen approach. */
  testerId: string | null;
}

export interface EventApproachView {
  id: string;
  label: string;
  description: string;
  /** Attribute tested (BASE value + roll vs difficulty); null = no test. */
  attribute: AttributeKey | null;
  difficulty: number | null;
}

export interface TestRollView {
  testerId: string;
  testerName: string;
  attribute: AttributeKey;
  /** The BASE attribute value used (equipment and buffs never count). */
  base: number;
  roll: number;
  total: number;
  difficulty: number;
  success: boolean;
}

export interface EventResultView {
  approachId: string;
  test: TestRollView | null;
  text: string;
  effects: string[];
}

export interface EventView {
  eventId: string;
  title: string;
  text: string;
  approaches: EventApproachView[];
  result: EventResultView | null;
}

/** What happened in a non-combat room (Campsite, Loot, Secret) or a discovery. */
export interface RoomOutcomeView {
  type: RoomType;
  title: string;
  text: string;
  effects: string[];
  /** Items found, per character. */
  items: Array<{ characterId: string; name: string }>;
  /** A secret search on entering the room (BASE Precision of the best searcher). */
  search: TestRollView | null;
}

/** Dungeon Threat: raised by failures, it strengthens the boss (request #33). */
export interface ThreatView {
  value: number;
  max: number;
  /** Current tier, if any (what it does to the boss). */
  tier: { name: string; description: string } | null;
  /** Next tier and the Threat it needs. */
  next: { name: string; description: string; at: number } | null;
}

export type RunPhase = 'map' | 'combat' | 'event' | 'room' | 'ended';
export type RunStatus = 'active' | 'victory' | 'defeat' | 'abandoned';

export interface RunRewardsDto {
  reputation: number;
  items: Array<{ id: string; name: string }>;
  /** Request #49: how many times you have beaten this Rift (1 = first time). */
  clearNumber?: number;
  /** Share of the Rift's reputation for this clear (100, 50, 25, then 0). */
  clearFactorPct?: number;
  /** Bonus from equipped gear (bonus effects and upgrades). */
  gearBonusPct?: number;
}

export interface RunPenaltyDto {
  /** Equipped items that lost quality. */
  damaged: Array<{ id: string; name: string; quality: number; broken: boolean }>;
}

export interface RunDto {
  id: string;
  riftId: string;
  riftName: string;
  /**
   * 'pvp' = arena match (test mode): one fight between two teams of players.
   * 'worldboss' = a fight against the season's world boss (request #43).
   */
  mode: 'rift' | 'pvp' | 'worldboss';
  /** World boss fights: damage dealt so far and the boss HP when the fight began. */
  worldBoss: { damage: number; startHp: number } | null;
  status: RunStatus;
  phase: RunPhase;
  /** Rooms entered so far. */
  roomsVisited: number;
  map: MapDto;
  /** Type of the room the party is in (null before the first room). */
  roomType: RoomType | null;
  party: RunMemberDto[];
  /** Lobby leader (breaks ties in votes). */
  leaderId: string;
  /** Combat rooms only. */
  combat: CombatView | null;
  /** Random Event rooms only. */
  event: EventView | null;
  /** Campsite/Loot/Secret result, or what was found on entering a room. */
  outcome: RoomOutcomeView | null;
  threat: ThreatView;
  /** Votes for the current decision (next room or event approach). */
  votes: VoteView[];
  /** ISO time the current decision or planning phase ends (60 s, D16). */
  deadline: string | null;
  /** Filled when the run ended (for the character that asked). */
  rewards: RunRewardsDto | null;
  penalty: RunPenaltyDto | null;
}

export const startRunRequestSchema = z.object({ characterId: z.uuid() });
export type StartRunRequest = z.infer<typeof startRunRequestSchema>;

const slotSchema = z
  .number()
  .int()
  .min(0)
  .max(SLOTS_PER_SIDE - 1);

export const combatActionSchema = z.discriminatedUnion('type', [
  /** Planning phase: add an action to the party's plan (resolved in planned order). */
  z.object({
    type: z.literal('plan'),
    abilityId: z.string().max(64),
    /** Target ally (single-target support abilities). */
    targetId: z.string().max(64).optional(),
    /** Target column (attacks hit both units of a column, D41). */
    targetColumn: z.enum(COMBAT_COLUMNS).optional(),
    /** Destination slot (Swap Position). */
    targetSlot: slotSchema.optional(),
  }),
  /** Remove one of your planned actions. */
  z.object({ type: z.literal('unplan'), planId: z.number().int().min(0) }),
  /** Confirm your plan; the round resolves when every player is ready. */
  z.object({ type: z.literal('ready') }),
  /** Vote for the next room (node id) or an event approach (+ who attempts it). */
  z.object({
    type: z.literal('vote'),
    optionId: z.string().max(64),
    testerId: z.uuid().optional(),
  }),
  /** Leave a finished room (cleared combat, event result, campsite, loot) for the map. */
  z.object({ type: z.literal('continue') }),
  /** Leave the Rift. Counts as a defeat (equipment loses quality). */
  z.object({ type: z.literal('abandon') }),
]);
export type CombatAction = z.infer<typeof combatActionSchema>;
export type PlanActionInput = Extract<CombatAction, { type: 'plan' }>;

export const runActionRequestSchema = z.object({
  characterId: z.uuid(),
  action: combatActionSchema,
});
export type RunActionRequest = z.infer<typeof runActionRequestSchema>;
