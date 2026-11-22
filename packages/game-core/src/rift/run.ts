import type {
  Attributes,
  CharacterAppearance,
  ConditionView,
  DerivedStatsDto,
  GearCombatEffects,
  EventResultView,
  MapDto,
  PlanActionInput,
  RoomOutcomeView,
  RoomType,
  RunMemberDto,
  RunPhase,
  StatusView,
  TestRollView,
  ThreatView,
  VoteView,
  WeaponSpecial,
} from '@realms/shared';
import { getEvent, type EventEffect, type EventTarget } from '../content/events.js';
import { getItemDef } from '../content/items.js';
import type { EnemyId } from '../content/enemies.js';
import { WORLD_BOSS_ID, worldBossEnemy } from '../content/world-boss.js';
import {
  getRift,
  goldTierMultiplier,
  RIFT_GOLD_RULES,
  riftTierModifiers,
  type LootTable,
  type RiftDef,
} from '../content/rifts.js';
import { isGear, rarityOf, rollAffixCount, rollAffixes } from '../content/affixes.js';
import {
  CONDITIONS,
  EXPLORATION_RULES,
  getCondition,
  ROOM_TYPE_INFO,
  THREAT_RULES,
  threatTier,
  type ConditionId,
} from '../content/rooms.js';
import {
  createEncounter,
  createPvpEncounter,
  leaveParty,
  partyAfterCombat,
  planAction,
  setReady,
  timeoutTurn,
  unplanAction,
} from '../combat/engine.js';
import { Rng } from '../combat/rng.js';
import { partyId, type CombatState, type PartyMemberInput } from '../combat/state.js';
import { attachSecret, childrenOf, findNode, generateRiftMap, type RiftMap } from './map.js';
import { attributeTest, type BaseAttributes } from './tests.js';

/*
 * A Rift run (request #31): the party moves through the branching map one
 * room at a time. State machine:
 *
 *   map ──vote──▶ combat ──cleared──▶ (continue) ──▶ map
 *    │            event ──vote──▶ result ──continue──▶ map
 *    │            room (Campsite / Loot / Secret) ──continue──▶ map
 *    └─ boss fight won ▶ ended (victory) · party wiped ▶ ended (defeat)
 *
 * Group decisions (owner): every player votes; majority wins once everyone
 * voted (or the timer ends); the leader breaks ties. For events, the vote
 * also names who attempts the approach (the group chooses).
 *
 * Pure and deterministic: the server stores this state (JSONB) and turns
 * `grants` into items.
 */

export const RUN_STATE_VERSION = 2;
/** Id used for PvP arena matches in `rift_runs.rift_id` and lobbies. */
export const PVP_ARENA_ID = 'pvp_arena';
export const PVP_ARENA_NAME = 'PvP Arena (test)';

export interface RunCondition {
  id: ConditionId;
  /** Rooms left (null = until removed). */
  rooms: number | null;
}

export interface RunMember {
  characterId: string;
  name: string;
  appearance: CharacterAppearance;
  /** BASE attributes — the only values used by exploration tests. */
  baseAttributes: BaseAttributes;
  /** Total attributes (base + equipment) — combat only. */
  attributes: Attributes;
  stats: DerivedStatsDto;
  abilityIds: string[];
  abilityMultipliers: Record<string, number>;
  /** Skill levels (request #53); absent in runs saved before it. */
  abilityExtraTurns?: Record<string, number>;
  /** Gear effects (request #37); missing on runs saved before it. */
  gear?: GearCombatEffects;
  hp: number;
  mana: number;
  slot: number;
  conditions: RunCondition[];
  left: boolean;
  /** PvP: which side this player fights on ('party' = team A, 'enemies' = team B). */
  team?: 'party' | 'enemies';
}

export interface ItemGrant {
  characterId: string;
  itemDefId: string;
  source: 'loot_room' | 'secret_room' | 'event';
  /** Bonus effects rolled when found (request #50: by Rift tier). */
  affixes?: WeaponSpecial[];
}

export interface RunState {
  version: typeof RUN_STATE_VERSION;
  /** 'pvp' = an arena match (request #33): one fight, two teams of players, no map. */
  mode?: 'rift' | 'pvp' | 'worldboss';
  /** World boss fight (request #43): the season and the boss HP when it began. */
  worldBoss?: { season: number; startHp: number };
  /** PvP: the winning team ('party' = team A, 'enemies' = team B). */
  winner?: 'party' | 'enemies' | null;
  riftId: string;
  rng: number;
  map: RiftMap;
  currentId: string | null;
  visited: string[];
  /** Secret rooms the party found. */
  revealed: string[];
  phase: RunPhase;
  status: 'active' | 'victory' | 'defeat';
  party: RunMember[];
  leaderId: string;
  combat: CombatState | null;
  event: { eventId: string; result: EventResultView | null } | null;
  outcome: RoomOutcomeView | null;
  votes: VoteView[];
  roomsVisited: number;
  /** Dungeon Threat (request #33): raised by failures, it strengthens the boss. */
  threat: number;
  /**
   * Items found in Loot/Secret rooms and events. They are only handed out if
   * the party beats the Rift (owner, request #33): a wiped party loses them,
   * and so does anyone who left early.
   */
  grants: ItemGrant[];
  /** Gold found on the way per character (request #50), kept only on victory. */
  gold?: Record<string, number>;
}

export type RunResult =
  | { ok: true; state: RunState }
  | { ok: false; code: 'INVALID_ACTION' | 'NOT_YOUR_TURN'; reason: string };

const fail = (
  reason: string,
  code: 'INVALID_ACTION' | 'NOT_YOUR_TURN' = 'INVALID_ACTION',
): RunResult => ({
  ok: false,
  code,
  reason,
});

export const activeMembers = (s: RunState) => s.party.filter((m) => !m.left);
const member = (s: RunState, id: string) => s.party.find((m) => m.characterId === id);
const isHidden = (s: RunState, id: string) =>
  findNode(s.map, id)?.type === 'secret' && !s.revealed.includes(id);

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------
export function createRun(opts: {
  rift: RiftDef;
  party: Array<Omit<RunMember, 'conditions' | 'left'>>;
  leaderId: string;
  seed: number;
}): RunState {
  const { rift } = opts;
  const map = generateRiftMap(
    rift.map,
    {
      combat: rift.encounters.combat.length,
      elite: rift.encounters.elite.length,
      events: rift.events,
    },
    opts.seed,
  );
  return {
    version: RUN_STATE_VERSION,
    riftId: rift.id,
    rng: (opts.seed * 2654435761) | 0,
    map,
    currentId: null,
    visited: [],
    revealed: [],
    phase: 'map',
    status: 'active',
    party: opts.party.map((m) => ({ ...m, conditions: [], left: false })),
    leaderId: opts.leaderId,
    combat: null,
    event: null,
    outcome: null,
    votes: [],
    roomsVisited: 0,
    // Deeper Rifts start with Threat already building (request #43).
    threat: rift.startingThreat ?? 0,
    grants: [],
  };
}

/**
 * PvP arena match (request #33, test mode): no map, one fight between two
 * teams of players with the normal combat rules. No rewards, no penalty.
 */
export function createPvpRun(opts: {
  teamA: Array<Omit<RunMember, 'conditions' | 'left' | 'team'>>;
  teamB: Array<Omit<RunMember, 'conditions' | 'left' | 'team'>>;
  leaderId: string;
  seed: number;
}): RunState {
  const party: RunMember[] = [
    ...opts.teamA.map((m) => ({ ...m, conditions: [], left: false, team: 'party' as const })),
    ...opts.teamB.map((m) => ({ ...m, conditions: [], left: false, team: 'enemies' as const })),
  ];
  return {
    version: RUN_STATE_VERSION,
    mode: 'pvp',
    winner: null,
    riftId: PVP_ARENA_ID,
    rng: (opts.seed * 2654435761) | 0,
    map: { rows: 0, cols: 0, nodes: [], edges: [], bossId: '' },
    currentId: null,
    visited: [],
    revealed: [],
    phase: 'combat',
    status: 'active',
    party,
    leaderId: opts.leaderId,
    combat: createPvpEncounter({
      teamA: party.filter((m) => m.team === 'party').map(toPartyInput),
      teamB: party.filter((m) => m.team === 'enemies').map(toPartyInput),
      seed: opts.seed,
    }),
    event: null,
    outcome: null,
    votes: [],
    roomsVisited: 1,
    threat: 0,
    grants: [],
  };
}

/**
 * World boss fight (request #43): no map, one fight against the season's boss,
 * whose HP is the shared pool. Ends when the party falls (or, one day, the
 * boss does). The damage dealt is `worldBossDamage`.
 */
export function createWorldBossRun(opts: {
  season: number;
  bossHp: number;
  party: Array<Omit<RunMember, 'conditions' | 'left'>>;
  leaderId: string;
  seed: number;
}): RunState {
  const party: RunMember[] = opts.party.map((m) => ({ ...m, conditions: [], left: false }));
  const enemy = worldBossEnemy(opts.season);
  const combat = createEncounter({
    party: party.map(toPartyInput),
    room: {
      name: enemy.name,
      enemies: [{ enemy: enemy.id as EnemyId, slot: 0 }],
      isBoss: true,
    },
    roomIndex: 0,
    isLastRoom: true,
    seed: opts.seed,
    enemyModifiers: { hpMultiplier: Math.max(1, opts.bossHp) / enemy.maxHp },
  });
  // Exact pool (the multiplier can round).
  for (const c of combat.combatants) {
    if (c.side !== 'enemies') continue;
    c.hp = c.maxHp = Math.max(1, opts.bossHp);
    c.stats = { ...c.stats, maxHp: c.maxHp };
  }
  return {
    version: RUN_STATE_VERSION,
    mode: 'worldboss',
    worldBoss: { season: opts.season, startHp: Math.max(1, opts.bossHp) },
    riftId: WORLD_BOSS_ID,
    rng: (opts.seed * 2654435761) | 0,
    map: { rows: 0, cols: 0, nodes: [], edges: [], bossId: '' },
    currentId: null,
    visited: [],
    revealed: [],
    phase: 'combat',
    status: 'active',
    party,
    leaderId: opts.leaderId,
    combat,
    event: null,
    outcome: null,
    votes: [],
    roomsVisited: 1,
    threat: 0,
    grants: [],
  };
}

/** Damage dealt to the world boss so far in this fight. */
export function worldBossDamage(s: RunState): number {
  if (s.mode !== 'worldboss' || !s.worldBoss || !s.combat) return 0;
  const boss = s.combat.combatants.find((c) => c.side === 'enemies');
  return Math.max(0, s.worldBoss.startHp - (boss?.hp ?? 0));
}

/** Rooms the party can go to next (hidden secrets excluded). */
export function availableRooms(s: RunState): string[] {
  if (s.phase !== 'map') return [];
  const ids = s.currentId
    ? childrenOf(s.map, s.currentId)
    : s.map.nodes.filter((n) => n.row === 0).map((n) => n.id);
  return ids.filter((id) => !isHidden(s, id));
}

/** The decision being voted on, if any: its options in display order. */
export function decisionOptions(s: RunState): string[] {
  if (s.status !== 'active') return [];
  if (s.phase === 'map') return availableRooms(s);
  if (s.phase === 'event' && s.event && !s.event.result)
    return getEvent(s.event.eventId)?.approaches.map((a) => a.id) ?? [];
  return [];
}

/** Whether the run is waiting for a timed decision (votes or combat planning). */
export function hasDeadline(s: RunState): boolean {
  if (s.status !== 'active') return false;
  if (s.phase === 'combat') return s.combat?.phase === 'planning';
  return decisionOptions(s).length > 0;
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------
export function vote(
  prev: RunState,
  characterId: string,
  optionId: string,
  testerId?: string,
): RunResult {
  const me = member(prev, characterId);
  if (!me || me.left) return fail('You are not in this run.', 'NOT_YOUR_TURN');
  const options = decisionOptions(prev);
  if (!options.length) return fail('There is nothing to choose right now.');
  if (!options.includes(optionId)) return fail('That is not one of the options.');
  let tester: string | null = null;
  if (prev.phase === 'event') {
    const approach = getEvent(prev.event!.eventId)!.approaches.find((a) => a.id === optionId)!;
    if (approach.attribute) {
      tester = testerId ?? characterId;
      const t = member(prev, tester);
      if (!t || t.left) return fail('Choose someone in the party to attempt it.');
    }
  }
  const s: RunState = structuredClone(prev);
  s.votes = s.votes.filter((v) => v.characterId !== characterId);
  s.votes.push({ characterId, optionId, testerId: tester });
  if (activeMembers(s).every((m) => s.votes.some((v) => v.characterId === m.characterId)))
    resolveDecision(s);
  return { ok: true, state: s };
}

/** Most voted value; ties go to the leader's choice, then the first in `order`. */
function tally(
  values: string[],
  order: string[],
  leaderValue: string | undefined,
): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(0, ...counts.values());
  if (max === 0) return undefined;
  const tied = order.filter((o) => counts.get(o) === max);
  return leaderValue && tied.includes(leaderValue) ? leaderValue : tied[0];
}

function resolveDecision(s: RunState): void {
  const options = decisionOptions(s);
  if (!options.length) return;
  const votes = s.votes.filter((v) => !member(s, v.characterId)?.left);
  const leaderVote = votes.find((v) => v.characterId === s.leaderId);
  // Nobody voted (timer): the first option (path) or the safest approach (event).
  let winner = tally(
    votes.map((v) => v.optionId),
    options,
    leaderVote?.optionId,
  );
  if (s.phase === 'map') {
    s.votes = [];
    enterRoom(s, winner ?? options[0]!);
    return;
  }
  const event = getEvent(s.event!.eventId)!;
  winner ??= event.approaches.find((a) => !a.attribute)?.id ?? options[0]!;
  const approach = event.approaches.find((a) => a.id === winner)!;
  let testerId: string | undefined;
  if (approach.attribute) {
    const forIt = votes.filter((v) => v.optionId === winner && v.testerId);
    const order = activeMembers(s).map((m) => m.characterId);
    testerId =
      tally(
        forIt.map((v) => v.testerId!),
        order,
        leaderVote?.optionId === winner ? (leaderVote.testerId ?? undefined) : undefined,
      ) ?? order[0];
  }
  s.votes = [];
  resolveEvent(s, approach.id, testerId);
}

// ---------------------------------------------------------------------------
// Entering rooms
// ---------------------------------------------------------------------------
function conditionView(c: RunCondition): ConditionView {
  const def = getCondition(c.id)!;
  return { id: c.id, name: def.name, description: def.description, kind: def.kind, rooms: c.rooms };
}

function toPartyInput(m: RunMember): PartyMemberInput {
  const statuses: StatusView[] = [];
  let firstRoundFocus = 0;
  let firstRoundBlock = 0;
  for (const c of m.conditions) {
    const fx = getCondition(c.id)?.combat;
    if (!fx) continue;
    if (fx.status)
      statuses.push({ id: fx.status.status, turns: fx.status.turns, value: fx.status.value ?? 0 });
    firstRoundFocus += fx.firstRoundFocus ?? 0;
    firstRoundBlock += fx.firstRoundBlock ?? 0;
  }
  return {
    characterId: m.characterId,
    name: m.name,
    appearance: m.appearance,
    attributes: m.attributes,
    stats: m.stats,
    abilityIds: m.abilityIds,
    abilityMultipliers: m.abilityMultipliers,
    abilityExtraTurns: m.abilityExtraTurns ?? {},
    gear: m.gear,
    hp: m.left ? 0 : m.hp,
    mana: m.mana,
    slot: m.slot,
    statuses,
    firstRoundFocus,
    firstRoundBlock,
  };
}

function rollLoot(rng: Rng, table: LootTable): string[] {
  const total = table.loot.reduce((sum, l) => sum + l.weight, 0);
  const out: string[] = [];
  for (let i = 0; i < table.drops; i++) {
    let r = rng.next() * total;
    out.push((table.loot.find((l) => (r -= l.weight) < 0) ?? table.loot[0]!).item);
  }
  return out;
}

function grant(
  s: RunState,
  rng: Rng,
  table: LootTable,
  who: RunMember[],
  source: ItemGrant['source'],
): RoomOutcomeView['items'] {
  const items: RoomOutcomeView['items'] = [];
  const tier = getRift(s.riftId)?.tier ?? 1;
  for (const m of who) {
    for (const itemDefId of rollLoot(rng, table)) {
      // Request #50: rarity rolled now (by tier) so the popup can show it.
      const kind = getItemDef(itemDefId)?.kind;
      const affixes = isGear(kind) ? rollAffixes(rng, kind, rollAffixCount(rng, tier)) : [];
      s.grants.push({ characterId: m.characterId, itemDefId, source, affixes });
      items.push({
        characterId: m.characterId,
        name: getItemDef(itemDefId)?.name ?? itemDefId,
        defId: itemDefId,
        rarity: rarityOf(affixes.length),
      });
    }
  }
  return items;
}

/** Gold found in a room by everyone present (request #50). */
function findGold(
  s: RunState,
  rng: Rng,
  range: { min: number; max: number },
  who: RunMember[],
): number {
  const tier = getRift(s.riftId)?.tier ?? 1;
  const amount = Math.round(
    (range.min + rng.int(range.max - range.min + 1)) * goldTierMultiplier(tier),
  );
  s.gold = s.gold ?? {};
  for (const m of who) s.gold[m.characterId] = (s.gold[m.characterId] ?? 0) + amount;
  return amount;
}

/** The best BASE value in the party searches for a hidden room next to this one. */
function searchForSecret(s: RunState, rng: Rng, nodeId: string): TestRollView | null {
  const secret = s.map.nodes.find(
    (n) => n.type === 'secret' && n.anchorId === nodeId && !s.revealed.includes(n.id),
  );
  if (!secret) return null;
  const { attribute, difficulty } = EXPLORATION_RULES.secretSearch;
  const searcher = [...activeMembers(s)].sort(
    (a, b) => b.baseAttributes[attribute] - a.baseAttributes[attribute],
  )[0];
  if (!searcher) return null;
  const test = attributeTest(searcher, attribute, difficulty, rng);
  if (test.success) s.revealed.push(secret.id);
  return test;
}

function enterRoom(s: RunState, nodeId: string): void {
  const node = findNode(s.map, nodeId)!;
  const rift = getRift(s.riftId)!;
  const rng = new Rng(s.rng);
  s.currentId = nodeId;
  s.visited.push(nodeId);
  s.roomsVisited += 1;
  s.outcome = null;
  s.event = null;
  const search = searchForSecret(s, rng, nodeId);
  const searchOutcome = (): RoomOutcomeView | null =>
    search
      ? {
          type: node.type,
          title: search.success ? 'A hidden passage!' : 'Nothing found',
          text: search.success
            ? `${search.testerName} spots a hidden passage: a secret room is now on the map.`
            : `${search.testerName} searched the walls but found nothing.`,
          effects: [],
          items: [],
          search,
        }
      : null;

  switch (node.type) {
    case 'combat':
    case 'elite':
    case 'boss': {
      const room =
        node.type === 'boss'
          ? rift.encounters.boss
          : rift.encounters[node.type][node.encounter ?? 0]!;
      const threat = node.type === 'boss' ? threatTier(s.threat) : null;
      // Every fight is scaled by the Rift's tier; the boss also by the Threat.
      const site = riftTierModifiers(rift.tier);
      const tier = {
        hpMultiplier: site.hpMultiplier * (threat?.hpMultiplier ?? 1),
        powerMultiplier: site.powerMultiplier * (threat?.powerMultiplier ?? 1),
        precisionBonus: threat?.precisionBonus ?? 0,
      };
      s.combat = createEncounter({
        party: s.party.map(toPartyInput),
        room,
        roomIndex: s.roomsVisited,
        isLastRoom: node.type === 'boss',
        seed: rng.int(2 ** 31),
        enemyModifiers: tier,
      });
      // Exploration conditions with combat effects were applied; anything the
      // combat statuses carry is visible on the fighters.
      s.phase = 'combat';
      s.outcome = searchOutcome();
      break;
    }
    case 'event': {
      s.phase = 'event';
      s.event = { eventId: node.eventId ?? rift.events[0]!, result: null };
      s.outcome = searchOutcome();
      break;
    }
    case 'campsite': {
      const c = EXPLORATION_RULES.campsite;
      const effects: string[] = [];
      for (const m of activeMembers(s)) {
        const hp = Math.min(m.stats.maxHp - m.hp, Math.round((m.stats.maxHp * c.hpPercent) / 100));
        const mana = Math.min(
          m.stats.maxMana - m.mana,
          Math.round((m.stats.maxMana * c.manaPercent) / 100),
        );
        m.hp += hp;
        m.mana += mana;
        const removed = c.removesDebuffs
          ? m.conditions.filter((x) => getCondition(x.id)?.kind === 'debuff')
          : [];
        m.conditions = m.conditions.filter((x) => !removed.includes(x));
        effects.push(
          `${m.name}: +${hp} HP, +${mana} Mana` +
            (removed.length
              ? `, no longer ${removed.map((r) => getCondition(r.id)!.name).join(', ')}`
              : ''),
        );
      }
      s.phase = 'room';
      s.outcome = {
        type: 'campsite',
        title: 'Campsite',
        text: `You rest by a small fire. You recover ${c.hpPercent}% of your HP and ${c.manaPercent}% of your Mana${c.removesDebuffs ? ', and shake off your debuffs' : ''}.`,
        effects,
        items: [],
        search,
      };
      break;
    }
    case 'loot':
    case 'secret': {
      const secret = node.type === 'secret';
      const items = grant(
        s,
        rng,
        secret ? rift.secretRoom : rift.lootRoom,
        activeMembers(s),
        secret ? 'secret_room' : 'loot_room',
      );
      const gold = findGold(
        s,
        rng,
        secret ? RIFT_GOLD_RULES.secretRoom : RIFT_GOLD_RULES.lootRoom,
        activeMembers(s),
      );
      s.phase = 'room';
      s.outcome = {
        type: node.type,
        title: secret ? 'Secret Room' : 'Treasure',
        text: secret
          ? 'A forgotten chamber, untouched for ages. Rare treasures wait inside — they are yours if the party beats the Rift.'
          : 'A cache of supplies and gear, something for everyone — kept only if the party beats the Rift.',
        effects: [],
        items,
        gold,
        search,
      };
      break;
    }
  }
  s.rng = rng.state;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function targets(s: RunState, target: EventTarget, testerId: string | undefined): RunMember[] {
  if (target === 'party' || !testerId) return activeMembers(s);
  const t = member(s, testerId);
  return t && !t.left ? [t] : [];
}

function addCondition(m: RunMember, id: ConditionId): void {
  const def = CONDITIONS[id];
  const existing = m.conditions.find((c) => c.id === id);
  if (existing)
    existing.rooms =
      def.rooms === null || existing.rooms === null ? null : Math.max(existing.rooms, def.rooms);
  else m.conditions.push({ id, rooms: def.rooms });
}

function applyEventEffect(
  s: RunState,
  rng: Rng,
  e: EventEffect,
  testerId: string | undefined,
  out: string[],
): void {
  const rift = getRift(s.riftId)!;
  switch (e.kind) {
    case 'hp':
      for (const m of targets(s, e.target, testerId)) {
        const delta = Math.round((m.stats.maxHp * e.percent) / 100);
        const before = m.hp;
        m.hp = Math.max(EXPLORATION_RULES.minHpFromEvents, Math.min(m.stats.maxHp, m.hp + delta));
        const d = m.hp - before;
        if (d) out.push(`${m.name}: ${d > 0 ? '+' : ''}${d} HP`);
      }
      return;
    case 'mana':
      for (const m of targets(s, e.target, testerId)) {
        const delta = Math.round((m.stats.maxMana * e.percent) / 100);
        const before = m.mana;
        m.mana = Math.max(0, Math.min(m.stats.maxMana, m.mana + delta));
        const d = m.mana - before;
        if (d) out.push(`${m.name}: ${d > 0 ? '+' : ''}${d} Mana`);
      }
      return;
    case 'condition':
      for (const m of targets(s, e.target, testerId)) {
        addCondition(m, e.condition);
        out.push(`${m.name} is ${CONDITIONS[e.condition].name}`);
      }
      return;
    case 'removeDebuffs':
      for (const m of targets(s, e.target, testerId)) {
        const before = m.conditions.length;
        m.conditions = m.conditions.filter((c) => getCondition(c.id)?.kind !== 'debuff');
        if (m.conditions.length < before) out.push(`${m.name} shakes off their debuffs`);
      }
      return;
    case 'item': {
      const table = e.table === 'secret' ? rift.secretRoom : rift.lootRoom;
      for (const it of grant(s, rng, table, targets(s, e.target, testerId), 'event')) {
        const who = member(s, it.characterId)?.name ?? '';
        out.push(`${who} found ${it.name}`);
      }
      return;
    }
    case 'revealSecret': {
      if (!s.currentId) return;
      let secret = s.map.nodes.find((n) => n.type === 'secret' && n.anchorId === s.currentId);
      if (!secret) {
        const id = attachSecret(s.map, s.currentId);
        secret = id ? findNode(s.map, id) : undefined;
      }
      if (secret && !s.revealed.includes(secret.id)) {
        s.revealed.push(secret.id);
        out.push('A secret room appears on the map');
      } else if (!secret) out.push('…but the passage leads nowhere this close to the boss');
      return;
    }
  }
}

function resolveEvent(s: RunState, approachId: string, testerId: string | undefined): void {
  const event = getEvent(s.event!.eventId)!;
  const approach = event.approaches.find((a) => a.id === approachId)!;
  const rng = new Rng(s.rng);
  let test: TestRollView | null = null;
  if (approach.attribute && approach.difficulty !== null) {
    const tester = member(s, testerId!)!;
    test = attributeTest(tester, approach.attribute, approach.difficulty, rng);
  }
  const outcome = !test || test.success ? approach.success : (approach.failure ?? approach.success);
  const effects: string[] = [];
  if (test && !test.success) {
    addThreat(s, THREAT_RULES.failedTest);
    effects.push(`Threat +${THREAT_RULES.failedTest}`);
  }
  for (const e of outcome.effects) applyEventEffect(s, rng, e, testerId, effects);
  s.event!.result = { approachId, test, text: outcome.text, effects };
  s.rng = rng.state;
}

// ---------------------------------------------------------------------------
// Combat passthrough
// ---------------------------------------------------------------------------
export function addThreat(s: RunState, n: number): void {
  s.threat = Math.max(0, Math.min(THREAT_RULES.max, (s.threat ?? 0) + n));
}

function syncFromCombat(s: RunState): void {
  if (!s.combat) return;
  for (const p of partyAfterCombat(s.combat)) {
    const m = member(s, p.characterId);
    if (!m) continue;
    m.hp = p.hp;
    m.mana = p.mana;
    m.slot = p.slot;
  }
  if (s.combat.phase === 'ended') {
    s.status = s.combat.outcome === 'victory' ? 'victory' : 'defeat';
    if (s.mode === 'pvp') s.winner = s.combat.outcome === 'victory' ? 'party' : 'enemies';
  }
  if (s.status !== 'active') s.phase = 'ended';
}

export function combatAction(
  prev: RunState,
  characterId: string,
  action: PlanActionInput | { type: 'unplan'; planId: number } | { type: 'ready' },
): RunResult {
  if (prev.phase !== 'combat' || !prev.combat) return fail('There is no fight right now.');
  const id = partyId(characterId);
  const res =
    action.type === 'plan'
      ? planAction(prev.combat, id, action)
      : action.type === 'unplan'
        ? unplanAction(prev.combat, id, action.planId)
        : setReady(prev.combat, id);
  if (!res.ok) return res;
  const s: RunState = structuredClone(prev);
  s.combat = res.state;
  syncFromCombat(s);
  return { ok: true, state: s };
}

/** Leave a finished room (or a cleared fight) and go back to the map. */
export function continueRun(prev: RunState): RunResult {
  if (prev.status !== 'active') return fail('This run has ended.');
  const done =
    (prev.phase === 'combat' && prev.combat?.phase === 'room_cleared') ||
    (prev.phase === 'event' && !!prev.event?.result) ||
    prev.phase === 'room';
  if (!done) return fail('Finish this room first.');
  const s: RunState = structuredClone(prev);
  syncFromCombat(s);
  if (prev.phase === 'combat' && currentRoomType(prev) === 'elite')
    addThreat(s, THREAT_RULES.eliteCleared);
  s.combat = null;
  s.event = null;
  s.outcome = null;
  s.votes = [];
  // Lasting conditions count down by room.
  for (const m of s.party)
    m.conditions = m.conditions
      .map((c) => ({ ...c, rooms: c.rooms === null ? null : c.rooms - 1 }))
      .filter((c) => c.rooms === null || c.rooms > 0);
  s.phase = 'map';
  return { ok: true, state: s };
}

/** A player leaves the run (A28). */
export function leaveRun(prev: RunState, characterId: string): RunState {
  const s: RunState = structuredClone(prev);
  const m = member(s, characterId);
  if (!m || m.left) return prev;
  m.left = true;
  m.hp = 0;
  s.votes = s.votes.filter((v) => v.characterId !== characterId);
  if (s.combat) {
    s.combat = leaveParty(s.combat, partyId(characterId));
    syncFromCombat(s);
  }
  if (!activeMembers(s).length) {
    s.status = 'defeat';
    s.phase = 'ended';
    return s;
  }
  if (s.leaderId === characterId) s.leaderId = activeMembers(s)[0]!.characterId;
  if (
    decisionOptions(s).length &&
    s.votes.length &&
    activeMembers(s).every((x) => s.votes.some((v) => v.characterId === x.characterId))
  )
    resolveDecision(s);
  return s;
}

/** The timer of the current decision or planning phase ran out. */
export function timeoutRun(prev: RunState): RunState {
  if (!hasDeadline(prev)) return prev;
  const s: RunState = structuredClone(prev);
  if (s.phase === 'combat' && s.combat) {
    s.combat = timeoutTurn(s.combat);
    syncFromCombat(s);
  } else {
    addThreat(s, THREAT_RULES.timedOutDecision);
    resolveDecision(s);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
/** The map as players see it: hidden secret rooms (and their connections) are never sent. */
export function toMapDto(s: RunState): MapDto {
  const available = new Set(availableRooms(s));
  const visible = s.map.nodes.filter((n) => !isHidden(s, n.id));
  const ids = new Set(visible.map((n) => n.id));
  return {
    rows: s.map.rows,
    cols: s.map.cols,
    nodes: visible.map((n) => ({
      id: n.id,
      row: n.row,
      col: n.col,
      type: n.type,
      visited: s.visited.includes(n.id),
      current: s.currentId === n.id,
      available: available.has(n.id),
      secret: n.type === 'secret',
    })),
    edges: s.map.edges.filter(([a, b]) => ids.has(a) && ids.has(b)),
  };
}

export function toRunMembers(s: RunState): RunMemberDto[] {
  // During a fight the fighters' HP/Mana are the live ones.
  const live = s.combat ? new Map(partyAfterCombat(s.combat).map((p) => [p.characterId, p])) : null;
  return s.party.map((m) => ({
    characterId: m.characterId,
    name: m.name,
    appearance: m.appearance,
    hp: live?.get(m.characterId)?.hp ?? m.hp,
    maxHp: m.stats.maxHp,
    mana: live?.get(m.characterId)?.mana ?? m.mana,
    maxMana: m.stats.maxMana,
    baseAttributes: { ...m.baseAttributes },
    conditions: m.conditions.map(conditionView),
    left: m.left,
    team: m.team ?? null,
  }));
}

export function toThreatView(s: RunState): ThreatView {
  const value = s.threat ?? 0;
  const tier = threatTier(value);
  const next = THREAT_RULES.tiers.find((t) => t.min > value) ?? null;
  return {
    value,
    max: THREAT_RULES.max,
    tier: tier ? { name: tier.name, description: tier.description } : null,
    next: next ? { name: next.name, description: next.description, at: next.min } : null,
  };
}

export const currentRoomType = (s: RunState): RoomType | null =>
  s.currentId ? (findNode(s.map, s.currentId)?.type ?? null) : null;

/** Rooms on any path to the boss (boss included). */
export const riftDepth = (r: RiftDef) => r.map.rows + 1;

export const roomTypeName = (t: RoomType) => ROOM_TYPE_INFO[t].name;
