import {
  COMBAT_COLUMNS,
  SLOTS_PER_SIDE,
  type CombatColumn,
  type CombatSide,
  type IntentView,
  type PlanActionInput,
  type EnemyFamily,
  type GearStatus,
  type PlannedActionView,
  type StatusId,
} from '@realms/shared';
import { AFFIX_RULES } from '../content/affixes.js';
import { CHAMPION_AFFIX_IDS, makeChampion, type ChampionAffixId } from '../content/champions.js';
import { getEnemy } from '../content/enemies.js';
import {
  BASIC_ACTIONS,
  getAbility,
  HARMFUL_STATUSES,
  UNARMED_ABILITIES,
  type AbilityDef,
  type AbilityEffect,
} from '../content/abilities.js';
import type { RiftRoomDef } from '../content/rifts.js';
import { WEAPON_TYPES } from '../content/weapons.js';
import { reductionFromRating, scalingMultiplier } from '../stats.js';
import { Rng } from './rng.js';
import {
  COMBAT_RULES,
  enemyCombatant,
  enemyCombatants,
  partyCombatant,
  pushLog,
  columnOfSlot,
  type Combatant,
  type CombatState,
  type EnemyModifiers,
  type PartyMemberInput,
} from './state.js';

/*
 * Turn-based combat engine. Pure and deterministic: (state, action) → state.
 *
 * Round (combat spec, request #31):
 *  1. A new round begins: Block is reset, damage-over-time ticks, statuses
 *     count down, every unit gains Focus from its Precision (unspent Focus
 *     carries over up to a cap), and team initiative is rolled
 *     (roll + Agility; each team uses its best result).
 *  2. Enemies plan their actions (intents, visible to players, D36).
 *  3. Planning: players add actions to the party plan, then confirm (ready).
 *  4. Resolution: actions resolve one at a time, alternating between teams,
 *     starting with the team that won initiative. Each team resolves its own
 *     actions in planned order (owner). When a team runs out, the other
 *     finishes. Every action resolves fully (damage → Block → HP → defeat)
 *     against the current battlefield before the next one.
 *  5. The round ends; the next one begins.
 *
 * The AI (planEnemyIntents) only decides what enemies want to do; the same
 * resolution code validates and applies every action, for both teams.
 */

export type EngineResult =
  | { ok: true; state: CombatState }
  | { ok: false; code: 'NOT_YOUR_TURN' | 'INVALID_ACTION'; reason: string };

const fail = (code: 'NOT_YOUR_TURN' | 'INVALID_ACTION', reason: string): EngineResult => ({
  ok: false,
  code,
  reason,
});

const alive = (c: Combatant) => !c.downed;
const isPvp = (s: CombatState) => s.mode === 'pvp';
const on = (state: CombatState, side: Combatant['side']) =>
  state.combatants.filter((c) => c.side === side);
const opposite = (side: CombatSide): CombatSide => (side === 'party' ? 'enemies' : 'party');
const get = (state: CombatState, id: string) => state.combatants.find((c) => c.id === id);
const hasStatus = (c: Combatant, id: StatusId) => c.statuses.some((s) => s.id === id);
const roll = (rng: Rng, min: number, max: number) => min + rng.int(max - min + 1);

/**
 * Players who still have to plan this round (alive, present, not stunned) —
 * on both sides in PvP.
 */
export function activePartyIds(state: CombatState): string[] {
  return state.combatants
    .filter((c) => c.kind === 'player' && alive(c) && !c.left && !c.stunned)
    .map((c) => c.id);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
export function createEncounter(opts: {
  party: PartyMemberInput[];
  room: RiftRoomDef;
  roomIndex: number;
  isLastRoom: boolean;
  seed: number;
  enemyModifiers?: EnemyModifiers;
}): CombatState {
  const state: CombatState = {
    round: 0,
    phase: 'planning',
    initiative: null,
    plan: [],
    ready: [],
    combatants: [
      ...opts.party.map((p) => partyCombatant(p)),
      ...enemyCombatants(opts.room, opts.roomIndex, opts.enemyModifiers),
    ],
    outcome: null,
    log: [],
    logSeq: 0,
    rng: opts.seed,
    tiebreak: {},
    initiativeRolls: {},
    planSeq: 0,
    isLastRoom: opts.isLastRoom,
    mode: 'pve',
  };
  const rng = new Rng(state.rng);
  for (const c of state.combatants) state.tiebreak[c.id] = rng.next();
  pickChampions(state, opts.room, rng, opts.enemyModifiers?.champions);
  state.rng = rng.state;
  startRound(state);
  // Exploration effects carried into the fight (debuffs and boons).
  for (const p of opts.party) {
    const unit = get(state, `p:${p.characterId}`);
    if (!unit || unit.downed) continue;
    for (const s of p.statuses ?? []) unit.statuses.push({ ...s });
    if (p.firstRoundFocus)
      unit.focus = Math.max(0, Math.min(COMBAT_RULES.focusMax, unit.focus + p.firstRoundFocus));
    if (p.firstRoundBlock) unit.block += p.firstRoundBlock;
  }
  return state;
}

/**
 * Request #71: some ordinary enemies are Champions with random affixes;
 * Elite enemies always are from a tier on. Bosses and mini-bosses never.
 */
function pickChampions(
  state: CombatState,
  room: RiftRoomDef,
  rng: Rng,
  rules: { chance: number; affixes: number; elite: boolean } | undefined,
): void {
  if (!rules || room.isBoss) return;
  const enemies = state.combatants.filter((c) => c.kind === 'enemy');
  enemies.forEach((unit, i) => {
    const def = unit.enemyDefId ? getEnemy(unit.enemyDefId) : undefined;
    if (!def || def.isBoss || def.isMiniBoss) return;
    const elite = !!room.enemies[i]?.elite;
    if (!(elite && rules.elite) && !rng.chance(rules.chance)) return;
    const pool = [...CHAMPION_AFFIX_IDS];
    const chosen: ChampionAffixId[] = [];
    for (let k = 0; k < rules.affixes && pool.length; k++)
      chosen.push(pool.splice(rng.int(pool.length), 1)[0]!);
    makeChampion(unit, chosen);
  });
}

/**
 * PvP (request #33, test mode): two teams of players, same rules — both plan
 * at the same time, team initiative decides who starts, actions alternate.
 * Team B stands on the 'enemies' side.
 */
export function createPvpEncounter(opts: {
  teamA: PartyMemberInput[];
  teamB: PartyMemberInput[];
  seed: number;
}): CombatState {
  const state: CombatState = {
    round: 0,
    phase: 'planning',
    initiative: null,
    plan: [],
    ready: [],
    combatants: [
      ...opts.teamA.map((p) => partyCombatant(p, 'party')),
      ...opts.teamB.map((p) => partyCombatant(p, 'enemies')),
    ],
    outcome: null,
    log: [],
    logSeq: 0,
    rng: opts.seed,
    tiebreak: {},
    initiativeRolls: {},
    planSeq: 0,
    isLastRoom: true,
    mode: 'pvp',
  };
  const rng = new Rng(state.rng);
  for (const c of state.combatants) state.tiebreak[c.id] = rng.next();
  state.rng = rng.state;
  startRound(state);
  return state;
}

function startRound(state: CombatState): void {
  state.round += 1;
  pushLog(state, { t: 'round', round: state.round });
  const units = state.combatants.filter((c) => alive(c) && !c.left);
  // Block is temporary. PvP: removed for everyone when a round begins. PvE
  // (Slay the Spire): the party's Block goes now; the enemies' Block lasts
  // through the party's turn and goes when the enemy phase begins.
  for (const u of state.combatants) if (isPvp(state) || u.side === 'party') u.block = 0;
  for (const u of units) {
    // Ritual (request #44): permanent Strength that grows every round.
    const ritual = u.statuses.find((s) => s.id === 'ritual');
    if (ritual && !u.downed) addStrength(state, u, ritual.value);
    // Fuse (request #44): when the counter runs out, the unit explodes.
    const fuse = u.statuses.find((s) => s.id === 'fuse');
    if (fuse && fuse.turns <= 1 && !u.downed) explode(state, u, fuse.value);
    // Request #67: HP regeneration from gear.
    if ((u.gear?.hpRegen ?? 0) > 0 && !u.downed) heal(state, u, u.gear!.hpRegen!);
    // Regeneration (request #47): heals at the start of the round.
    const regen = u.statuses.find((s) => s.id === 'regen');
    if (regen && !u.downed) {
      const healed = Math.min(u.maxHp - u.hp, Math.round(regen.value));
      if (healed > 0) {
        u.hp += healed;
        pushLog(state, { t: 'heal', targetId: u.id, amount: healed });
      }
    }
    for (const s of u.statuses) {
      if ((s.id === 'bleed' || s.id === 'burn') && !u.downed) {
        const amount = Math.min(u.hp, Math.round(s.value));
        u.hp -= amount;
        pushLog(state, { t: 'tick', targetId: u.id, status: s.id, amount });
        if (u.hp <= 0) knockDown(state, u);
      }
    }
    if (u.downed) continue;
    u.stunned = hasStatus(u, 'stun');
    if (u.stunned) pushLog(state, { t: 'stunned', targetId: u.id });
    // Request #67: Chill — less Focus this round.
    const chill = statusValue(u, 'chill');
    u.statuses = u.statuses.map((s) => ({ ...s, turns: s.turns - 1 })).filter((s) => s.turns > 0);
    u.focus = Math.max(
      0,
      Math.min(COMBAT_RULES.focusMax, u.focus + u.focusPerRound) - Math.round(chill),
    );
    u.mana = Math.min(u.maxMana, u.mana + u.stats.manaRegen);
  }
  checkPhases(state);
  if (checkEnd(state)) return;
  // PvE: the party always acts first, then the enemies (no initiative roll).
  if (isPvp(state)) rollInitiative(state);
  else state.initiative = null;
  state.phase = 'planning';
  state.plan = [];
  state.ready = [];
  planEnemyIntents(state);
  // Nobody can plan (everyone stunned): the round resolves at once.
  if (activePartyIds(state).length === 0) resolveRound(state);
}

/** Initiative = roll + Agility for every unit; each team keeps its best (combat spec §4). */
function rollInitiative(state: CombatState): void {
  const rng = new Rng(state.rng);
  state.initiativeRolls = {};
  const best: Record<CombatSide, number> = { party: 0, enemies: 0 };
  for (const u of state.combatants) {
    if (!alive(u) || u.left) continue;
    const value = 1 + rng.int(COMBAT_RULES.initiativeDie) + u.stats.initiative;
    state.initiativeRolls[u.id] = value;
    best[u.side] = Math.max(best[u.side], value);
  }
  // Ties: a coin flip.
  const first: CombatSide =
    best.party > best.enemies
      ? 'party'
      : best.enemies > best.party
        ? 'enemies'
        : rng.next() < 0.5
          ? 'party'
          : 'enemies';
  state.rng = rng.state;
  state.initiative = { party: best.party, enemies: best.enemies, first };
  pushLog(state, { t: 'initiative', party: best.party, enemies: best.enemies, first });
}

function knockDown(state: CombatState, unit: Combatant): void {
  unit.hp = 0;
  unit.downed = true;
  unit.focus = 0;
  unit.block = 0;
  unit.stunned = false;
  unit.statuses = [];
  unit.intents = [];
  pushLog(state, { t: 'downed', targetId: unit.id });
}

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------
/** Units an ability may target. 'first' = the first occupied column (A30). */
export function validTargets(
  state: Pick<CombatState, 'combatants'>,
  actor: Combatant,
  ability: AbilityDef,
): Combatant[] {
  const t = ability.targeting;
  if (t.side === 'self') return [actor];
  const side = t.side === 'enemy' ? opposite(actor.side) : actor.side;
  const all = state.combatants.filter((c) => c.side === side && alive(c));
  // Request #71: Taunt — single and column attacks must aim at a taunting foe.
  const taunting =
    t.side === 'enemy' && t.area !== 'all' ? all.filter((c) => hasStatus(c, 'taunt')) : [];
  const units = taunting.length ? taunting : all;
  if (taunting.length) return units;
  if (t.reach === 'any') return units;
  if (t.reach === 'first' || t.reach === 'first2') {
    const wanted = t.reach === 'first' ? 1 : 2;
    const cols: CombatColumn[] = [];
    for (const col of COMBAT_COLUMNS)
      if (cols.length < wanted && units.some((u) => columnOfSlot(u.slot) === col)) cols.push(col);
    return units.filter((u) => cols.includes(columnOfSlot(u.slot)));
  }
  const cols = t.reach;
  return units.filter((u) => cols.includes(columnOfSlot(u.slot)));
}

function resolveTargets(
  state: CombatState,
  actor: Combatant,
  ability: AbilityDef,
  targetId: string | undefined,
  targetColumn?: CombatColumn,
): Combatant[] | string {
  const candidates = validTargets(state, actor, ability);
  if (candidates.length === 0) return 'No valid targets.';
  const area = ability.targeting.area;
  if (area === 'all') return candidates;
  if (area === 'column') {
    // D41: attacks pick a column, not a unit.
    const columns = [...new Set(candidates.map((c) => columnOfSlot(c.slot)))];
    const fromId = targetId ? candidates.find((c) => c.id === targetId) : undefined;
    const column =
      targetColumn ??
      (fromId ? columnOfSlot(fromId.slot) : columns.length === 1 ? columns[0] : undefined);
    if (!column) return 'Choose a column.';
    const hit = candidates.filter((c) => columnOfSlot(c.slot) === column);
    return hit.length ? hit : 'That column is out of reach.';
  }
  const chosen = targetId
    ? candidates.find((c) => c.id === targetId)
    : candidates.length === 1
      ? candidates[0]
      : undefined;
  return chosen ? [chosen] : 'Choose a valid target.';
}

/** Columns an ability can be aimed at, with the units it would hit. */
export function targetColumns(
  state: Pick<CombatState, 'combatants'>,
  actor: Combatant,
  ability: AbilityDef,
): Array<{ column: CombatColumn; units: Combatant[] }> {
  const out = new Map<CombatColumn, Combatant[]>();
  for (const u of validTargets(state, actor, ability)) {
    const col = columnOfSlot(u.slot);
    out.set(col, [...(out.get(col) ?? []), u]);
  }
  return [...out].map(([column, units]) => ({ column, units }));
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
/** Ability value multiplier: player attribute scaling × weapon upgrade, or enemy power. */
function valueMultiplier(actor: Combatant, ability: AbilityDef): number {
  const upgrade = actor.abilityMultipliers?.[ability.id] ?? 1;
  return (
    (actor.attributes ? scalingMultiplier(actor.attributes, ability.scaling) : actor.power) *
    upgrade
  );
}

/**
 * Block absorbs damage before HP (combat spec §7.1):
 * damage to HP = max(0, incoming − block); block left = max(0, block − incoming).
 */
export function absorbWithBlock(
  incoming: number,
  block: number,
): { toHp: number; blocked: number; blockLeft: number } {
  const blocked = Math.min(block, Math.max(0, incoming));
  return { toHp: Math.max(0, incoming - block), blocked, blockLeft: Math.max(0, block - incoming) };
}

function addStatus(
  state: CombatState,
  target: Combatant,
  status: StatusId,
  turns: number,
  value: number,
): void {
  const existing = target.statuses.find((s) => s.id === status);
  if (existing) {
    existing.turns = Math.max(existing.turns, turns);
    existing.value = Math.max(existing.value, value);
  } else target.statuses.push({ id: status, turns, value });
  pushLog(state, { t: 'status', targetId: target.id, status, turns });
}

/** Request #67: basic attacks (one per weapon type, plus unarmed). */
const BASIC_ATTACK_IDS = new Set<string>([
  ...Object.values(WEAPON_TYPES).map((w) => w.basicAttack),
  ...UNARMED_ABILITIES,
]);
export const isBasicAttack = (abilityId: string) => BASIC_ATTACK_IDS.has(abilityId);

/** Players count as humanoids for "strong against" bonuses (D123). */
const familyOf = (c: Combatant): EnemyFamily | undefined =>
  c.kind === 'player' ? 'humanoid' : c.family;

const GEAR_STATUSES = new Set<StatusId>([
  'bleed',
  'burn',
  'stun',
  'weaken',
  'mark',
  'chill',
  'blind',
]);

/**
 * A harmful status from a foe (request #67): gear may resist it, and the
 * attacker's gear may make it stronger (Bleed/Burn) or longer.
 */
function inflict(
  state: CombatState,
  rng: Rng,
  source: Combatant,
  target: Combatant,
  status: StatusId,
  turns: number,
  value: number,
): void {
  if (target.downed) return;
  const resist = GEAR_STATUSES.has(status)
    ? (target.gear?.statusResist?.[status as GearStatus] ?? 0)
    : 0;
  if (resist > 0 && rng.chance(resist)) return;
  const g = source.gear;
  if (g) {
    if ((status === 'bleed' || status === 'burn') && (g.dotDamagePct ?? 0) > 0 && value > 0)
      value = Math.max(1, Math.round(value * (1 + g.dotDamagePct! / 100)));
    if (status === 'stun') {
      if ((g.stunDurationChance ?? 0) > 0 && rng.chance(g.stunDurationChance!)) turns += 1;
    } else if ((g.statusDurationChance ?? 0) > 0 && rng.chance(g.statusDurationChance!)) turns += 1;
  }
  addStatus(state, target, status, turns, value);
}

const heal = (state: CombatState, u: Combatant, n: number) => {
  const amount = Math.min(u.maxHp - u.hp, Math.round(n));
  if (amount > 0 && !u.downed) {
    u.hp += amount;
    pushLog(state, { t: 'heal', targetId: u.id, amount });
  }
};

const hurt = (state: CombatState, u: Combatant, n: number) => {
  if (u.downed) return;
  const amount = Math.min(u.hp, Math.round(n));
  u.hp -= amount;
  pushLog(state, { t: 'damage', targetId: u.id, amount, crit: false, blocked: 0 });
  if (u.hp <= 0) knockDown(state, u);
};

/**
 * Gear effects after a hit lands (requests #37, #67): life / mana steal and
 * life on hit heal the attacker, thorns hurt the attacker, on-hit statuses
 * may stick to the target, Impale stores part of the hit, kills give rewards.
 */
function gearOnHit(
  state: CombatState,
  rng: Rng,
  actor: Combatant,
  target: Combatant,
  toHp: number,
  killed: boolean,
): void {
  const g = actor.gear;
  if (g && toHp > 0 && !actor.downed) {
    if (g.lifestealPct > 0) heal(state, actor, (toHp * g.lifestealPct) / 100);
    if ((g.lifeOnHit ?? 0) > 0) heal(state, actor, g.lifeOnHit!);
    if ((g.manaStealPct ?? 0) > 0)
      actor.mana = Math.min(actor.maxMana, actor.mana + Math.round((toHp * g.manaStealPct!) / 100));
  }
  if (g && !target.downed && actor.side !== target.side) {
    const potency = 1 + actor.stats.effectPotency / 100;
    for (const hit of g.onHit) {
      if (!rng.chance(hit.chance)) continue;
      const base = AFFIX_RULES.onHitValue[hit.status];
      const value = base ? Math.max(1, Math.round(base * potency)) : 0;
      inflict(state, rng, actor, target, hit.status, AFFIX_RULES.onHitTurns[hit.status], value);
    }
    if ((g.impaleChance ?? 0) > 0 && toHp > 0 && rng.chance(g.impaleChance!))
      addStatus(
        state,
        target,
        'impale',
        AFFIX_RULES.impaleTurns,
        Math.max(1, Math.round((toHp * AFFIX_RULES.impalePct) / 100)),
      );
  }
  if (g && killed && !actor.downed && actor.side !== target.side) {
    if ((g.lifeOnKill ?? 0) > 0) heal(state, actor, g.lifeOnKill!);
    if ((g.manaOnKill ?? 0) > 0) actor.mana = Math.min(actor.maxMana, actor.mana + g.manaOnKill!);
    if ((g.focusOnKillChance ?? 0) > 0 && rng.chance(g.focusOnKillChance!))
      actor.focus = Math.min(COMBAT_RULES.focusMax, actor.focus + 1);
    if ((g.onslaught ?? 0) > 0)
      addStatus(state, actor, 'strength', AFFIX_RULES.onslaughtTurns, g.onslaught!);
  }
  const thorns = target.gear?.thorns ?? 0;
  if (thorns > 0 && actor !== target && actor.side !== target.side && !actor.downed)
    hurt(state, actor, thorns);
}

/** Request #67: +% damage multiplier from the attacker's gear for this hit. */
function gearDamageFactor(
  state: CombatState,
  actor: Combatant,
  ability: AbilityDef,
  target: Combatant,
): number {
  const g = actor.gear;
  if (!g) return 1;
  const basic = isBasicAttack(ability.id);
  const fam = familyOf(target);
  const pct =
    g.damagePct +
    (target.isBoss ? g.bossDamagePct : 0) +
    (basic ? (g.basicDamagePct ?? 0) : (g.skillDamagePct ?? 0)) +
    (ability.source === 'weapon' ? (g.weaponDamagePct ?? 0) : 0) +
    (fam ? (g.vsFamily?.[fam] ?? 0) : 0) +
    (isPvp(state) && target.kind === 'player' ? (g.pvpDamagePct ?? 0) : 0) +
    (hasStatus(target, 'bleed') ? (g.vsBleedingPct ?? 0) : 0) +
    (hasStatus(target, 'burn') ? (g.vsBurningPct ?? 0) : 0) +
    (hasStatus(target, 'stun') || target.stunned ? (g.vsStunnedPct ?? 0) : 0);
  return 1 + pct / 100;
}

/** Request #67: −% damage taken from the defender's gear for this hit. */
function gearDefenceFactor(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  damageType: 'physical' | 'ranged' | 'magic',
): number {
  const g = target.gear;
  if (!g || actor.side === target.side) return 1;
  const pct =
    (damageType === 'magic' ? (g.magicDefencePct ?? 0) : (g.physicalDefencePct ?? 0)) +
    (actor.isBoss ? (g.bossResistPct ?? 0) : 0) +
    (familyOf(actor) === 'humanoid' ? (g.humanoidResistPct ?? 0) : 0) +
    (isPvp(state) && actor.kind === 'player' ? (g.pvpResistPct ?? 0) : 0) +
    (target.hp >= (target.maxHp * AFFIX_RULES.fullHpThresholdPct) / 100
      ? (g.fullHpGuardPct ?? 0)
      : 0);
  return Math.max(0, 1 - pct / 100);
}

/** Armor / Magic Resist after piercing and penetration (request #67). */
function effectiveReduction(
  rng: Rng,
  actor: Combatant,
  target: Combatant,
  damageType: 'physical' | 'ranged' | 'magic',
  pierced: boolean,
): number {
  if (pierced) return 0;
  const magic = damageType === 'magic';
  const rating = magic ? target.stats.magicResist : target.stats.armor;
  const pen = (magic ? actor.gear?.magicPenPct : actor.gear?.armorPenPct) ?? 0;
  return reductionFromRating(rating * Math.max(0, 1 - pen / 100));
}

/** Basic attacks with "adds X damage": between half the value and the value. */
const addedRoll = (rng: Rng, v: number | undefined) =>
  v && v > 0 ? roll(rng, Math.max(1, Math.ceil(v / 2)), v) : 0;

/**
 * Applies one effect. Characters never dodge at random (request #43): an
 * ability lands unless its own rules say otherwise. Returns false to stop the
 * rest of the ability on this target.
 */
function applyEffect(
  state: CombatState,
  rng: Rng,
  actor: Combatant,
  ability: AbilityDef,
  effect: AbilityEffect,
  target: Combatant,
): boolean {
  const mult = valueMultiplier(actor, ability);
  switch (effect.kind) {
    case 'damage': {
      const g = actor.gear;
      const foe = actor.side !== target.side;
      const basic = isBasicAttack(ability.id);
      // Request #67: Blind — the blinded unit's hits may miss.
      if (foe && hasStatus(actor, 'blind') && rng.chance(statusValue(actor, 'blind'))) {
        pushLog(state, { t: 'damage', targetId: target.id, amount: 0, crit: false, blocked: 0 });
        return true;
      }
      // 1. Incoming damage.
      let dmg = roll(rng, effect.min, effect.max) * mult;
      // Request #67: "adds X damage" on the basic attack (same type as the attack).
      if (basic && g) dmg += addedRoll(rng, g.addedPhysical);
      // Request #53: Weaken and Mark carry their strength (percent) as value;
      // without one they use the default multipliers.
      if (hasStatus(actor, 'weaken')) dmg *= weakenFactor(statusValue(actor, 'weaken'));
      if (hasStatus(target, 'mark')) dmg *= markFactor(statusValue(target, 'mark'));
      if (effect.bonusVs && hasStatus(target, effect.bonusVs.status))
        dmg *= effect.bonusVs.multiplier;
      if (effect.bonusVsBlock && target.block > 0) dmg *= effect.bonusVsBlock;
      // Strength (request #44): flat extra damage per hit.
      dmg += statusValue(actor, 'strength');
      // Gear effects (requests #37, #67): +% damage, vs bosses, vs families…
      const factor = gearDamageFactor(state, actor, ability, target);
      dmg *= factor;
      const crit = rng.chance(actor.stats.critChance);
      if (crit) dmg *= actor.stats.critDamage / 100;
      const pierced = !!g && foe && (g.pierceChance ?? 0) > 0 && rng.chance(g.pierceChance!);
      const defence = gearDefenceFactor(state, actor, target, effect.damageType);
      dmg = Math.max(
        1,
        Math.round(
          dmg * (1 - effectiveReduction(rng, actor, target, effect.damageType, pierced)) * defence,
        ),
      );
      // Request #67: "adds X magic damage" on the basic attack, against Magic Resist.
      const magicAdd = basic && g ? addedRoll(rng, g.addedMagic) : 0;
      if (magicAdd > 0)
        dmg += Math.round(
          magicAdd *
            factor *
            (crit ? actor.stats.critDamage / 100 : 1) *
            (1 - effectiveReduction(rng, actor, target, 'magic', pierced)) *
            gearDefenceFactor(state, actor, target, 'magic'),
        );
      // Request #67: Impale — damage stored by an earlier hit comes out now.
      const impaled = statusValue(target, 'impale');
      if (impaled > 0) {
        dmg += Math.round(impaled);
        target.statuses = target.statuses.filter((s) => s.id !== 'impale');
      }
      // Request #67: a chance to block a melee hit completely.
      const tg = target.gear;
      if (
        foe &&
        effect.damageType === 'physical' &&
        (tg?.blockChance ?? 0) > 0 &&
        rng.chance(tg!.blockChance!)
      ) {
        pushLog(state, { t: 'damage', targetId: target.id, amount: 0, crit, blocked: dmg });
        return true;
      }
      // 2. Block absorbs. 3. The rest comes off HP.
      const { toHp, blocked, blockLeft } = absorbWithBlock(dmg, target.block);
      target.block = blockLeft;
      // Intangible (request #44): every hit deals at most 1.
      let capped = hasStatus(target, 'intangible') ? Math.min(1, toHp) : toHp;
      // Request #67: part of the damage can be paid with Mana.
      if (foe && (tg?.damageToManaPct ?? 0) > 0 && capped > 0) {
        const paid = Math.min(target.mana, Math.round((capped * tg!.damageToManaPct!) / 100));
        target.mana -= paid;
        capped -= paid;
      }
      let amount = Math.min(target.hp, capped);
      // Request #67: Culling Strike — a non-boss left this low dies.
      const cull = foe && !target.isBoss ? (g?.cullingPct ?? 0) : 0;
      if (cull > 0 && target.hp - amount > 0 && target.hp - amount <= (target.maxHp * cull) / 100)
        amount = target.hp;
      target.hp -= amount;
      pushLog(state, { t: 'damage', targetId: target.id, amount, crit, blocked });
      // 4–5. Status update and defeat check.
      const killed = target.hp <= 0;
      if (killed) knockDown(state, target);
      gearOnHit(state, rng, actor, target, amount, killed);
      // Drain (request #44): heals the attacker for the damage dealt.
      if (effect.drain && amount > 0 && !actor.downed) heal(state, actor, amount);
      // Request #67: a chance to send a melee hit back.
      if (
        foe &&
        effect.damageType === 'physical' &&
        amount > 0 &&
        !actor.downed &&
        (tg?.reflectChance ?? 0) > 0 &&
        rng.chance(tg!.reflectChance!)
      )
        hurt(state, actor, amount);
      // Request #62: named gear can strike back at melee attackers.
      if (effect.damageType === 'physical' && foe && !actor.downed && amount > 0)
        for (const w of tg?.whenHit ?? []) {
          if (!rng.chance(w.chance)) continue;
          const base = AFFIX_RULES.onHitValue[w.status];
          const potency = 1 + target.stats.effectPotency / 100;
          inflict(
            state,
            rng,
            target,
            actor,
            w.status,
            AFFIX_RULES.onHitTurns[w.status],
            base ? Math.max(1, Math.floor(base * potency)) : 0,
          );
        }
      // Thorns (request #44): hitting it hurts.
      const thorns = statusValue(target, 'thorns');
      if (thorns > 0 && foe && !actor.downed) hurt(state, actor, thorns);
      return true;
    }
    case 'heal': {
      const bonus = 1 + (actor.stats.healingPower + target.stats.healingReceived) / 100;
      const raw = Math.max(1, Math.round(roll(rng, effect.min, effect.max) * mult * bonus));
      const amount = Math.min(target.maxHp - target.hp, raw);
      target.hp += amount;
      pushLog(state, { t: 'heal', targetId: target.id, amount });
      return true;
    }
    case 'block': {
      // Block stacks (combat spec §7.2). The Dodge action (id 'block') grows
      // with Agility (request #44).
      const agility =
        ability.id === 'block' && actor.attributes
          ? Math.floor(actor.attributes.agility * BASIC_ACTIONS.block.perAgility)
          : 0;
      const amount = Math.max(1, Math.round(roll(rng, effect.min, effect.max) * mult) + agility);
      target.block += amount;
      pushLog(state, { t: 'block', targetId: target.id, amount });
      return true;
    }
    case 'status': {
      const potency = 1 + actor.stats.effectPotency / 100;
      // Request #59: power values are whole numbers, rounded down.
      const value = effect.value ? Math.max(1, Math.floor(effect.value * mult * potency)) : 0;
      // Skill levels (request #53): statuses (not Stun) last longer from M1.
      const extra = effect.status === 'stun' ? 0 : (actor.abilityExtraTurns?.[ability.id] ?? 0);
      // Request #67: harmful statuses on a foe go through gear (resist, duration).
      if (actor.side !== target.side && HARMFUL_STATUSES.includes(effect.status))
        inflict(state, rng, actor, target, effect.status, effect.turns + extra, value);
      else addStatus(state, target, effect.status, effect.turns + extra, value);
      return true;
    }
    case 'swap':
      return true;
    case 'summon':
      summon(state, actor, effect.enemy);
      return true;
    case 'cleanse': {
      const remove = effect.statuses ?? HARMFUL_STATUSES;
      target.statuses = target.statuses.filter((s) => !remove.includes(s.id));
      if (remove.includes('stun')) target.stunned = false;
      return true;
    }
  }
}

/** Damage factor of Mark: +value % (default from COMBAT_RULES), at most +100 %. */
export const markFactor = (value: number) =>
  value > 0 ? 1 + Math.min(COMBAT_RULES.maxMarkPct, value) / 100 : COMBAT_RULES.markMultiplier;
/** Damage factor of Weaken: −value % (default from COMBAT_RULES), at most −75 %. */
export const weakenFactor = (value: number) =>
  value > 0 ? 1 - Math.min(COMBAT_RULES.maxWeakenPct, value) / 100 : COMBAT_RULES.weakenMultiplier;

const statusValue = (c: Combatant, id: StatusId) => c.statuses.find((s) => s.id === id)?.value ?? 0;

/** Ritual: Strength that never runs out and keeps growing. */
function addStrength(state: CombatState, u: Combatant, n: number): void {
  const s = u.statuses.find((x) => x.id === 'strength');
  if (s) {
    s.value += n;
    s.turns = Math.max(s.turns, 99);
  } else u.statuses.push({ id: 'strength', turns: 99, value: n });
  pushLog(state, { t: 'status', targetId: u.id, status: 'strength', turns: 99 });
}

/** Fuse ran out: damage every unit of the other side, then the unit is gone. */
function explode(state: CombatState, u: Combatant, damage: number): void {
  pushLog(state, { t: 'explode', actorId: u.id });
  for (const t of state.combatants) {
    if (t.side === u.side || !alive(t) || t.left) continue;
    const { toHp, blocked, blockLeft } = absorbWithBlock(damage, t.block);
    t.block = blockLeft;
    const amount = Math.min(t.hp, toHp);
    t.hp -= amount;
    pushLog(state, { t: 'damage', targetId: t.id, amount, crit: false, blocked });
    if (t.hp <= 0) knockDown(state, t);
  }
  knockDown(state, u);
}

/**
 * Request #71: boss and mini-boss phases. Called after every action and at
 * the start of each round; each phase triggers once, in order.
 */
function checkPhases(state: CombatState): void {
  for (const u of state.combatants) {
    if (u.kind !== 'enemy' || u.downed || !u.enemyDefId) continue;
    const phases = getEnemy(u.enemyDefId)?.phases;
    if (!phases) continue;
    let done = u.phase ?? 0;
    while (done < phases.length && (u.hp / u.maxHp) * 100 <= phases[done]!.atHpPct) {
      const ph = phases[done]!;
      done += 1;
      u.phase = done;
      pushLog(state, { t: 'phase', actorId: u.id, text: ph.text });
      if (ph.abilities) u.abilityIds = [...ph.abilities];
      for (const st of ph.statuses ?? []) addStatus(state, u, st.id, st.turns ?? 99, st.value);
      if (ph.healPct) heal(state, u, (u.maxHp * ph.healPct) / 100);
      for (const e of ph.summon ?? []) summon(state, u, e);
    }
  }
}

/** Summon (request #44): a new enemy in the first empty position of the actor's side. */
function summon(state: CombatState, actor: Combatant, enemyId: string): void {
  const taken = new Set(
    state.combatants.filter((c) => c.side === actor.side && alive(c) && !c.left).map((c) => c.slot),
  );
  const slot = Array.from({ length: SLOTS_PER_SIDE }, (_, i) => i).find((i) => !taken.has(i));
  if (slot === undefined) return;
  state.summonSeq = (state.summonSeq ?? 0) + 1;
  const unit = enemyCombatant(enemyId, `${actor.id}:s${state.summonSeq}`, slot);
  // Summons act from the next round.
  state.combatants.push(unit);
  pushLog(state, { t: 'summon', actorId: actor.id, unitId: unit.id });
}

function applyAbility(
  state: CombatState,
  rng: Rng,
  actor: Combatant,
  ability: AbilityDef,
  targets: Combatant[],
): void {
  actor.focus -= ability.focusCost;
  actor.mana -= ability.manaCost;
  // Request #67: "casting speed" — a skill may give 1 Focus back.
  const refund = actor.gear?.focusRefundChance ?? 0;
  if (
    refund > 0 &&
    ability.focusCost > 0 &&
    ability.source !== 'universal' &&
    !isBasicAttack(ability.id) &&
    rng.chance(refund)
  )
    actor.focus += 1;
  pushLog(state, {
    t: 'ability',
    actorId: actor.id,
    abilityId: ability.id,
    targetIds: targets.map((x) => x.id),
  });
  for (const target of targets) {
    if (actor.downed) break; // e.g. killed by thorns
    for (const effect of ability.effects) {
      if (target.downed || actor.downed) break;
      if (!applyEffect(state, rng, actor, ability, effect, target)) break;
    }
  }
}

/** Returns true if the encounter ended (room cleared or party wiped). */
function checkEnd(state: CombatState): boolean {
  if (state.phase !== 'planning') return true;
  if (state.mode === 'pvp') {
    // PvP (request #33): the last team standing wins; nobody gets back up.
    const partyDown = on(state, 'party').every((p) => p.downed);
    const enemiesDown = on(state, 'enemies').every((p) => p.downed);
    if (!partyDown && !enemiesDown) return false;
    pushLog(state, { t: 'room', outcome: partyDown ? 'wiped' : 'cleared' });
    state.plan = [];
    state.ready = [];
    state.phase = 'ended';
    state.outcome = partyDown ? 'defeat' : 'victory';
    return true;
  }
  if (on(state, 'enemies').every((e) => e.downed)) {
    for (const p of on(state, 'party')) {
      if (p.downed && !p.left) {
        p.downed = false;
        p.hp = COMBAT_RULES.reviveHp;
        pushLog(state, { t: 'revived', targetId: p.id, hp: p.hp });
      }
      p.focus = 0;
      p.block = 0;
      p.stunned = false;
      p.statuses = [];
    }
    pushLog(state, { t: 'room', outcome: 'cleared' });
    state.plan = [];
    state.ready = [];
    if (state.isLastRoom) {
      state.phase = 'ended';
      state.outcome = 'victory';
    } else state.phase = 'room_cleared';
    return true;
  }
  if (on(state, 'party').every((p) => p.downed)) {
    pushLog(state, { t: 'room', outcome: 'wiped' });
    state.plan = [];
    state.ready = [];
    state.phase = 'ended';
    state.outcome = 'defeat';
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Enemy AI (simple, deterministic): best expected value per Focus; single
// targets: lowest HP (ties random). Decides only; resolution validates.
// ---------------------------------------------------------------------------
/** Rough value of an ability against a set of targets (enemy AI). */
function expectedValue(a: AbilityDef, targets: Combatant[]): number {
  let v = 0;
  for (const e of a.effects) {
    const avg = 'min' in e ? (e.min + e.max) / 2 : 0;
    for (const t of targets) {
      if (e.kind === 'damage') v += avg * (hasStatus(t, 'mark') ? 1.25 : 1);
      if (e.kind === 'status' && !hasStatus(t, e.status)) v += (e.value ?? 3) * e.turns * 0.6;
      // Blocking pays off more when the column is shared (D42: one blocks, one attacks).
      if (e.kind === 'block' && t.block === 0) v += avg * (targets.length > 1 ? 0.8 : 0.3);
      if (e.kind === 'heal' && t.hp < t.maxHp * 0.6) v += avg;
      if (e.kind === 'summon') v += 6;
      if (e.kind === 'cleanse' && t.statuses.some((s) => HARMFUL_STATUSES.includes(s.id))) v += 5;
    }
  }
  return v;
}

interface Plan {
  ability: AbilityDef;
  targets: Combatant[];
  column: CombatColumn | null;
}

/** Best affordable move for an enemy: highest value per Focus over every target choice. */
function bestMove(state: CombatState, enemy: Combatant, focus: number, rng: Rng): Plan | null {
  let best: { plan: Plan; score: number } | null = null;
  for (const id of enemy.abilityIds) {
    const a = getAbility(id);
    if (!a || a.focusCost > focus || a.manaCost > enemy.mana) continue;
    const choices: Plan[] = [];
    if (a.targeting.area === 'all')
      choices.push({ ability: a, targets: validTargets(state, enemy, a), column: null });
    else if (a.targeting.area === 'column')
      for (const c of targetColumns(state, enemy, a))
        choices.push({ ability: a, targets: c.units, column: c.column });
    else {
      const ts = validTargets(state, enemy, a);
      if (ts.length) {
        const minHp = Math.min(...ts.map((t) => t.hp));
        const weakest = ts.filter((t) => t.hp === minHp);
        choices.push({ ability: a, targets: [weakest[rng.int(weakest.length)]!], column: null });
      }
    }
    for (const plan of choices) {
      if (plan.targets.length === 0) continue;
      // Small random tie-breaker keeps enemies from being perfectly predictable.
      const score = expectedValue(a, plan.targets) / Math.max(1, a.focusCost) + rng.next() * 0.01;
      if (score > 0 && (!best || score > best.score)) best = { plan, score };
    }
  }
  return best?.plan ?? null;
}

/**
 * Intents (D36): at the start of each round every enemy plans its actions
 * with the Focus it has, and players see them while planning.
 */
function planEnemyIntents(state: CombatState): void {
  const rng = new Rng(state.rng);
  for (const enemy of state.combatants.filter((c) => c.kind === 'enemy')) {
    enemy.intents = [];
    if (enemy.downed || enemy.stunned) continue;
    let focus = enemy.focus;
    for (let guard = 0; guard < COMBAT_RULES.maxActionsPerRound; guard++) {
      const plan = bestMove(state, enemy, focus, rng);
      if (!plan) break;
      enemy.intents.push({
        abilityId: plan.ability.id,
        targetIds: plan.targets.map((t) => t.id),
        column: plan.column,
      });
      focus -= plan.ability.focusCost;
    }
  }
  state.rng = rng.state;
}

/** Targets for a planned column/area action now; re-aim if the planned column is empty. */
function currentTargets(
  state: CombatState,
  actor: Combatant,
  a: AbilityDef,
  plannedColumn: CombatColumn | null | undefined,
  plannedIds: string[],
  rng: Rng,
): Combatant[] {
  if (a.targeting.area === 'all') return validTargets(state, actor, a);
  if (a.targeting.area === 'column') {
    const cols = targetColumns(state, actor, a);
    const planned = cols.find((c) => c.column === plannedColumn);
    if (planned) return planned.units;
    // The planned column is empty now: aim at the most crowded reachable column.
    return [...cols].sort((x, y) => y.units.length - x.units.length)[0]?.units ?? [];
  }
  const candidates = validTargets(state, actor, a);
  const still = candidates.find((c) => plannedIds.includes(c.id));
  if (still) return [still];
  // Support on a specific ally: no re-aim (they are gone); enemy attacks pick the weakest.
  if (a.targeting.side !== 'enemy' || !candidates.length) return [];
  const minHp = Math.min(...candidates.map((t) => t.hp));
  const weakest = candidates.filter((t) => t.hp === minHp);
  return [weakest[rng.int(weakest.length)]!];
}

// ---------------------------------------------------------------------------
// Planning (players)
// ---------------------------------------------------------------------------
/** Focus and Mana already committed by a unit's planned actions this round. */
export function reservedBy(
  state: Pick<CombatState, 'plan' | 'combatants'>,
  unitId: string,
): { focus: number; mana: number } {
  let focus = 0;
  let mana = 0;
  for (const p of state.plan) {
    const a = getAbility(p.abilityId);
    if (!a) continue;
    if (p.actorId === unitId) {
      focus += a.focusCost;
      mana += a.manaCost;
    } else if (a.effects.some((e) => e.kind === 'swap') && p.targetSlot !== undefined) {
      // Swapping with another player costs them Focus too (D27).
      const actor = state.combatants.find((c) => c.id === p.actorId);
      const other = state.combatants.find(
        (c) => c.side === actor?.side && c.slot === p.targetSlot && c.kind === 'player',
      );
      if (other?.id === unitId) focus += a.focusCost;
    }
  }
  return { focus, mana };
}

function validatePlan(state: CombatState, actor: Combatant, input: PlanActionInput): string | null {
  if (!actor.abilityIds.includes(input.abilityId)) return 'You do not have that ability.';
  const ability = getAbility(input.abilityId);
  if (!ability) return 'Unknown ability.';
  const reserved = reservedBy(state, actor.id);
  if (ability.focusCost > actor.focus - reserved.focus) return 'Not enough Focus.';
  if (ability.manaCost > actor.mana - reserved.mana) return 'Not enough Mana.';
  if (state.plan.filter((p) => p.actorId === actor.id).length >= COMBAT_RULES.maxActionsPerRound)
    return 'Too many actions this round.';
  if (ability.effects.some((e) => e.kind === 'swap')) {
    if (input.targetSlot === undefined || input.targetSlot === actor.slot)
      return 'Choose another slot.';
    const other = on(state, actor.side).find((c) => c.slot === input.targetSlot);
    if (other && other.kind === 'player' && !other.downed) {
      const theirs = reservedBy(state, other.id);
      if (other.focus - theirs.focus < ability.focusCost)
        return `${other.name} does not have enough Focus to swap.`;
    }
    return null;
  }
  const targets = resolveTargets(state, actor, ability, input.targetId, input.targetColumn);
  return typeof targets === 'string' ? targets : null;
}

/**
 * A player's action.
 * - PvE (owner, request #34 — Slay the Spire): it happens at once. When every
 *   player ends the turn, the enemies carry out their intents.
 * - PvP: it is added to the team plan and resolved later, alternating teams.
 */
export function planAction(
  prev: CombatState,
  actorId: string,
  input: PlanActionInput,
): EngineResult {
  if (prev.phase !== 'planning') return fail('INVALID_ACTION', 'Nothing to plan right now.');
  const actor = get(prev, actorId);
  if (!actor || actor.kind !== 'player' || !activePartyIds(prev).includes(actorId))
    return fail('NOT_YOUR_TURN', 'You cannot act this round.');
  if (prev.ready.includes(actorId))
    return fail('INVALID_ACTION', 'You already confirmed your actions.');
  const reason = validatePlan(prev, actor, input);
  if (reason) return fail('INVALID_ACTION', reason);
  const state: CombatState = structuredClone(prev);
  const ability = getAbility(input.abilityId)!;
  // Fix the aim now (column attacks keep their column; single targets their id).
  let targetColumn = input.targetColumn;
  let targetId = input.targetId;
  if (!ability.effects.some((e) => e.kind === 'swap')) {
    const targets = resolveTargets(state, actor, ability, input.targetId, input.targetColumn);
    if (typeof targets !== 'string') {
      if (ability.targeting.area === 'column') targetColumn = columnOfSlot(targets[0]!.slot);
      else if (ability.targeting.area === 'single') targetId = targets[0]!.id;
    }
  }
  const planned: PlannedActionView = {
    id: isPvp(state) ? ++state.planSeq : 0,
    actorId,
    abilityId: input.abilityId,
    ...(targetId !== undefined && ability.targeting.area === 'single' ? { targetId } : {}),
    ...(targetColumn !== undefined && ability.targeting.area === 'column' ? { targetColumn } : {}),
    ...(input.targetSlot !== undefined ? { targetSlot: input.targetSlot } : {}),
  };
  if (!isPvp(state)) {
    // PvE: it happens now.
    const rng = new Rng(state.rng);
    resolvePlanned(state, rng, planned);
    state.rng = rng.state;
    checkEnd(state);
    return { ok: true, state };
  }
  state.plan.push(planned);
  return { ok: true, state };
}

/** Remove one of your planned actions (before confirming). */
export function unplanAction(prev: CombatState, actorId: string, planId: number): EngineResult {
  if (!isPvp(prev)) return fail('INVALID_ACTION', 'Actions happen at once: nothing to undo.');
  if (prev.phase !== 'planning') return fail('INVALID_ACTION', 'Nothing to change right now.');
  if (prev.ready.includes(actorId))
    return fail('INVALID_ACTION', 'You already confirmed your actions.');
  const p = prev.plan.find((x) => x.id === planId);
  if (!p || p.actorId !== actorId)
    return fail('INVALID_ACTION', 'That is not one of your actions.');
  const state: CombatState = structuredClone(prev);
  state.plan = state.plan.filter((x) => x.id !== planId);
  return { ok: true, state };
}

/**
 * End your turn (PvE) / confirm your plan (PvP). When every active player is
 * ready: PvE → the enemy phase; PvP → the alternating resolution.
 */
export function setReady(prev: CombatState, actorId: string): EngineResult {
  if (prev.phase !== 'planning') return fail('INVALID_ACTION', 'Nothing to confirm right now.');
  if (!activePartyIds(prev).includes(actorId))
    return fail('NOT_YOUR_TURN', 'You cannot act this round.');
  if (prev.ready.includes(actorId)) return { ok: true, state: prev };
  const state: CombatState = structuredClone(prev);
  state.ready.push(actorId);
  maybeResolve(state);
  return { ok: true, state };
}

function maybeResolve(state: CombatState): void {
  const active = activePartyIds(state);
  if (state.phase === 'planning' && active.every((id) => state.ready.includes(id)))
    resolveRound(state);
}

/** Planning timer expired (D16): whatever was planned resolves. */
export function timeoutTurn(prev: CombatState): CombatState {
  if (prev.phase !== 'planning') return prev;
  const state: CombatState = structuredClone(prev);
  pushLog(state, { t: 'timeout', actorId: null });
  resolveRound(state);
  return state;
}

// ---------------------------------------------------------------------------
// Resolution (alternating between teams)
// ---------------------------------------------------------------------------
type QueuedAction =
  | { kind: 'plan'; plan: PlannedActionView }
  | { kind: 'intent'; actorId: string; intent: IntentView };

function resolveRound(state: CombatState): void {
  const rng = new Rng(state.rng);
  // PvE: only the enemies are left to act (the party already did, live); their
  // Block from last round goes now. PvP: the initiative winner starts.
  const first = isPvp(state) ? (state.initiative?.first ?? 'party') : 'enemies';
  if (!isPvp(state)) for (const e of on(state, 'enemies')) e.block = 0;
  pushLog(state, { t: 'resolve', first });

  // Each team: its players' actions in planned order, then its AI units'
  // intents (by initiative, each unit's intents in turn). In PvE the party
  // has only players and the enemies only AI; in PvP both sides are players.
  const queueOf = (side: CombatSide): QueuedAction[] => [
    ...state.plan
      .filter((p) => get(state, p.actorId)?.side === side)
      .map((plan) => ({ kind: 'plan' as const, plan })),
    ...on(state, side)
      .filter((e) => e.kind === 'enemy' && !e.downed)
      .sort(
        (a, b) =>
          (state.initiativeRolls[b.id] ?? 0) - (state.initiativeRolls[a.id] ?? 0) ||
          (state.tiebreak[b.id] ?? 0) - (state.tiebreak[a.id] ?? 0),
      )
      .flatMap((e) =>
        e.intents.map((intent) => ({ kind: 'intent' as const, actorId: e.id, intent })),
      ),
  ];
  const queues: Record<CombatSide, QueuedAction[]> = {
    party: queueOf('party'),
    enemies: queueOf('enemies'),
  };

  let side: CombatSide = first;
  while (queues.party.length || queues.enemies.length) {
    if (!queues[side].length) side = opposite(side);
    const next = queues[side].shift()!;
    if (next.kind === 'plan') resolvePlanned(state, rng, next.plan);
    else resolveIntent(state, rng, next.actorId, next.intent);
    if (checkEnd(state)) {
      state.rng = rng.state;
      return;
    }
    side = opposite(side);
  }
  for (const e of on(state, 'enemies')) e.intents = [];
  state.rng = rng.state;
  startRound(state);
}

function skip(state: CombatState, actorId: string, abilityId: string, reason: string): void {
  pushLog(state, { t: 'skipped', actorId, abilityId, reason });
}

function resolvePlanned(state: CombatState, rng: Rng, p: PlannedActionView): void {
  const actor = get(state, p.actorId);
  const ability = getAbility(p.abilityId);
  if (!actor || !ability) return;
  // Defeated characters never act (combat spec §5.1).
  if (actor.downed || actor.left) return skip(state, actor.id, ability.id, 'down');
  if (actor.stunned) return skip(state, actor.id, ability.id, 'stunned');
  if (ability.focusCost > actor.focus) return skip(state, actor.id, ability.id, 'no Focus');
  if (ability.manaCost > actor.mana) return skip(state, actor.id, ability.id, 'no Mana');
  if (ability.effects.some((e) => e.kind === 'swap')) {
    const res = swap(state, actor, ability, p.targetSlot);
    if (typeof res === 'string') skip(state, actor.id, ability.id, res);
    return;
  }
  const targets = currentTargets(
    state,
    actor,
    ability,
    p.targetColumn,
    p.targetId ? [p.targetId] : [],
    rng,
  );
  if (!targets.length) return skip(state, actor.id, ability.id, 'no target');
  applyAbility(state, rng, actor, ability, targets);
  checkPhases(state);
}

function resolveIntent(state: CombatState, rng: Rng, actorId: string, intent: IntentView): void {
  const enemy = get(state, actorId);
  const a = getAbility(intent.abilityId);
  if (!enemy || !a || enemy.downed || enemy.stunned) return;
  if (a.focusCost > enemy.focus) return skip(state, enemy.id, a.id, 'no Focus');
  const targets = currentTargets(state, enemy, a, intent.column, intent.targetIds, rng);
  if (!targets.length) return skip(state, enemy.id, a.id, 'no target');
  applyAbility(state, rng, enemy, a, targets);
  checkPhases(state);
}

/** Change position (D27): costs the actor; swapping with another living player costs them too. */
function swap(
  state: CombatState,
  actor: Combatant,
  ability: AbilityDef,
  targetSlot: number | undefined,
): string | void {
  if (targetSlot === undefined || targetSlot === actor.slot) return 'already there';
  const other = on(state, actor.side).find((c) => c.slot === targetSlot);
  const otherPays = other && other.kind === 'player' && !other.downed;
  if (otherPays && other.focus < ability.focusCost) return `${other.name} has no Focus`;
  actor.focus -= ability.focusCost;
  if (otherPays) other.focus -= ability.focusCost;
  const from = actor.slot;
  actor.slot = targetSlot;
  if (other) other.slot = from;
  pushLog(state, {
    t: 'swap',
    actorId: actor.id,
    fromSlot: from,
    toSlot: targetSlot,
    withId: other?.id ?? null,
  });
}

/**
 * A player leaves a group run (A28). They count as down for the rest of the
 * run (never revived); their planned actions are dropped.
 */
export function leaveParty(prev: CombatState, actorId: string): CombatState {
  const state: CombatState = structuredClone(prev);
  const unit = get(state, actorId);
  if (!unit || unit.left) return prev;
  unit.left = true;
  unit.downed = true;
  unit.hp = 0;
  unit.block = 0;
  unit.statuses = [];
  state.plan = state.plan.filter((p) => p.actorId !== actorId);
  state.ready = state.ready.filter((id) => id !== actorId);
  pushLog(state, { t: 'left', actorId });
  if (checkEnd(state)) return state;
  maybeResolve(state);
  return state;
}

/** Party HP/Mana after a fight (carried into exploration, D29). */
export function partyAfterCombat(
  state: CombatState,
): Array<{ characterId: string; hp: number; mana: number; slot: number }> {
  return state.combatants
    .filter((c) => c.kind === 'player')
    .map((c) => ({
      characterId: c.characterId!,
      hp: c.hp,
      mana: c.mana,
      slot: c.slot,
    }));
}
