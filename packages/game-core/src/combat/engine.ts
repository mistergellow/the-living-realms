import type { CombatAction, StatusId } from '@realms/shared';
import { getAbility, type AbilityDef, type AbilityEffect } from '../content/abilities.js';
import type { RiftRoomDef } from '../content/rifts.js';
import { reductionFromRating, scalingMultiplier } from '../stats.js';
import { Rng } from './rng.js';
import {
  COMBAT_RULES,
  enemyCombatants,
  partyCombatant,
  pushLog,
  rowOfSlot,
  type Combatant,
  type CombatState,
  type PartyMemberInput,
} from './state.js';

/*
 * Turn-based combat engine. Pure and deterministic: (state, action) → state.
 *
 * PvE round (D14): party members act one at a time by initiative, then every
 * enemy acts (AI). At the start of its turn a unit loses its Block, takes
 * damage-over-time, counts statuses down, and gains Focus (D15/D24).
 * Damage (D33/D34): roll in range × attribute scaling × statuses × crit, then
 * mitigation rating/(rating+K), then Block absorbs.
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
const on = (state: CombatState, side: Combatant['side']) =>
  state.combatants.filter((c) => c.side === side);
const opposite = (side: Combatant['side']) => (side === 'party' ? 'enemies' : 'party');
const get = (state: CombatState, id: string) => state.combatants.find((c) => c.id === id);
const hasStatus = (c: Combatant, id: StatusId) => c.statuses.some((s) => s.id === id);
const roll = (rng: Rng, min: number, max: number) => min + rng.int(max - min + 1);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
export function createEncounter(opts: {
  party: PartyMemberInput[];
  room: RiftRoomDef;
  roomIndex: number;
  isLastRoom: boolean;
  seed: number;
}): CombatState {
  const state: CombatState = {
    round: 0,
    phase: 'party',
    activeId: null,
    turnOrder: [],
    combatants: [...opts.party.map(partyCombatant), ...enemyCombatants(opts.room, opts.roomIndex)],
    outcome: null,
    log: [],
    logSeq: 0,
    rng: opts.seed,
    tiebreak: {},
    isLastRoom: opts.isLastRoom,
  };
  const rng = new Rng(state.rng);
  for (const c of state.combatants) state.tiebreak[c.id] = rng.next();
  state.rng = rng.state;
  startRound(state);
  return state;
}

/** Carry the party (HP, mana, slots) into the next room with fresh enemies. */
export function enterNextRoom(
  prev: CombatState,
  room: RiftRoomDef,
  roomIndex: number,
  isLastRoom: boolean,
): CombatState {
  const state: CombatState = structuredClone(prev);
  state.combatants = [
    ...on(state, 'party').map((c) => ({ ...c, focus: 0, block: 0, statuses: [] })),
    ...enemyCombatants(room, roomIndex),
  ];
  const rng = new Rng(state.rng);
  for (const c of state.combatants) if (c.side === 'enemies') state.tiebreak[c.id] = rng.next();
  state.rng = rng.state;
  state.isLastRoom = isLastRoom;
  state.outcome = null;
  state.round = 0;
  startRound(state);
  return state;
}

const byInitiative = (state: CombatState) => (a: Combatant, b: Combatant) =>
  b.stats.initiative - a.stats.initiative ||
  (state.tiebreak[b.id] ?? 0) - (state.tiebreak[a.id] ?? 0);

function startRound(state: CombatState): void {
  state.round += 1;
  pushLog(state, { t: 'round', round: state.round });
  state.phase = 'party';
  state.turnOrder = on(state, 'party')
    .filter(alive)
    .sort(byInitiative(state))
    .map((c) => c.id);
  state.activeId = null;
  planEnemyIntents(state);
  advanceToNextPartyTurn(state);
}

function knockDown(state: CombatState, unit: Combatant): void {
  unit.hp = 0;
  unit.downed = true;
  unit.focus = 0;
  unit.block = 0;
  unit.statuses = [];
  pushLog(state, { t: 'downed', targetId: unit.id });
}

/**
 * Start of a unit's turn. Returns false if it cannot act (downed by a tick,
 * or stunned).
 */
function beginTurn(state: CombatState, unit: Combatant): boolean {
  unit.block = 0;
  pushLog(state, { t: 'turn', actorId: unit.id });
  for (const s of unit.statuses) {
    if ((s.id === 'bleed' || s.id === 'burn') && !unit.downed) {
      const amount = Math.min(unit.hp, s.value);
      unit.hp -= amount;
      pushLog(state, { t: 'tick', targetId: unit.id, status: s.id, amount });
      if (unit.hp <= 0) knockDown(state, unit);
    }
  }
  if (unit.downed) return false;
  const stunned = hasStatus(unit, 'stun');
  unit.statuses = unit.statuses
    .map((s) => ({ ...s, turns: s.turns - 1 }))
    .filter((s) => s.turns > 0);
  unit.focus = Math.min(COMBAT_RULES.focusMax, unit.focus + COMBAT_RULES.focusPerTurn);
  unit.mana = Math.min(unit.maxMana, unit.mana + unit.stats.manaRegen);
  if (stunned) {
    pushLog(state, { t: 'stunned', targetId: unit.id });
    return false;
  }
  return true;
}

function advanceToNextPartyTurn(state: CombatState): void {
  const order = state.turnOrder;
  let idx = state.activeId ? order.indexOf(state.activeId) + 1 : 0;
  while (idx < order.length) {
    const unit = get(state, order[idx]!);
    idx++;
    if (!unit || !alive(unit)) continue;
    state.activeId = unit.id;
    const canAct = beginTurn(state, unit);
    if (checkEnd(state)) return;
    if (canAct) return;
  }
  state.activeId = null;
  runEnemyPhase(state);
}

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------
/** Units an ability may target. "front" = the first occupied row (A14). */
export function validTargets(
  state: CombatState,
  actor: Combatant,
  ability: AbilityDef,
): Combatant[] {
  const t = ability.targeting;
  if (t.side === 'self') return [actor];
  const side = t.side === 'enemy' ? opposite(actor.side) : actor.side;
  const units = on(state, side).filter(alive);
  if (t.side === 'ally') return units.filter((u) => t.rows.includes(rowOfSlot(u.slot)));
  if (t.rows.length === 2) return units;
  if (t.rows[0] === 'back') return units.filter((u) => rowOfSlot(u.slot) === 'back');
  const front = units.filter((u) => rowOfSlot(u.slot) === 'front');
  return front.length ? front : units.filter((u) => rowOfSlot(u.slot) === 'back');
}

function resolveTargets(
  state: CombatState,
  actor: Combatant,
  ability: AbilityDef,
  targetId: string | undefined,
): Combatant[] | string {
  const candidates = validTargets(state, actor, ability);
  if (candidates.length === 0) return 'No valid targets.';
  const area = ability.targeting.area;
  if (area === 'all') return candidates;
  const chosen = targetId
    ? candidates.find((c) => c.id === targetId)
    : candidates.length === 1 || area === 'row'
      ? candidates[0]
      : undefined;
  if (!chosen) return 'Choose a valid target.';
  if (area === 'single') return [chosen];
  return candidates.filter((c) => rowOfSlot(c.slot) === rowOfSlot(chosen.slot));
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
/** Ability value multiplier: player attribute scaling, or enemy power. */
function valueMultiplier(actor: Combatant, ability: AbilityDef): number {
  return actor.attributes ? scalingMultiplier(actor.attributes, ability.scaling) : actor.power;
}

/** Returns false if the target dodged (the rest of the ability misses it too). */
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
      if (effect.damageType !== 'magic' && rng.chance(target.stats.dodgeChance)) {
        pushLog(state, { t: 'dodge', targetId: target.id });
        return false;
      }
      let dmg = roll(rng, effect.min, effect.max) * mult;
      if (hasStatus(actor, 'weaken')) dmg *= COMBAT_RULES.weakenMultiplier;
      if (hasStatus(target, 'mark')) dmg *= COMBAT_RULES.markMultiplier;
      if (effect.bonusVs && hasStatus(target, effect.bonusVs.status))
        dmg *= effect.bonusVs.multiplier;
      const crit = rng.chance(actor.stats.critChance);
      if (crit) dmg *= actor.stats.critDamage / 100;
      const rating = effect.damageType === 'magic' ? target.stats.magicResist : target.stats.armor;
      dmg = Math.max(1, Math.round(dmg * (1 - reductionFromRating(rating))));
      const blocked = Math.min(target.block, dmg);
      target.block -= blocked;
      const amount = Math.min(target.hp, dmg - blocked);
      target.hp -= amount;
      pushLog(state, { t: 'damage', targetId: target.id, amount, crit, blocked });
      if (target.hp <= 0) knockDown(state, target);
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
      const amount = Math.max(1, Math.round(roll(rng, effect.min, effect.max) * mult));
      target.block += amount;
      pushLog(state, { t: 'block', targetId: target.id, amount });
      return true;
    }
    case 'status': {
      const potency = 1 + actor.stats.effectPotency / 100;
      const value = effect.value ? Math.max(1, Math.round(effect.value * mult * potency)) : 0;
      const existing = target.statuses.find((s) => s.id === effect.status);
      if (existing) {
        existing.turns = Math.max(existing.turns, effect.turns);
        existing.value = Math.max(existing.value, value);
      } else target.statuses.push({ id: effect.status, turns: effect.turns, value });
      pushLog(state, {
        t: 'status',
        targetId: target.id,
        status: effect.status,
        turns: effect.turns,
      });
      return true;
    }
    case 'swap':
      return true;
  }
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
  pushLog(state, {
    t: 'ability',
    actorId: actor.id,
    abilityId: ability.id,
    targetIds: targets.map((x) => x.id),
  });
  for (const target of targets) {
    for (const effect of ability.effects) {
      if (target.downed) break;
      if (!applyEffect(state, rng, actor, ability, effect, target)) break;
    }
  }
}

/** Returns true if the encounter ended (room cleared or party wiped). */
function checkEnd(state: CombatState): boolean {
  if (on(state, 'enemies').every((e) => e.downed)) {
    for (const p of on(state, 'party')) {
      if (p.downed) {
        p.downed = false;
        p.hp = COMBAT_RULES.reviveHp;
        pushLog(state, { t: 'revived', targetId: p.id, hp: p.hp });
      }
      p.focus = 0;
      p.block = 0;
      p.statuses = [];
    }
    pushLog(state, { t: 'room', outcome: 'cleared' });
    state.activeId = null;
    if (state.isLastRoom) {
      state.phase = 'ended';
      state.outcome = 'victory';
    } else state.phase = 'room_cleared';
    return true;
  }
  if (on(state, 'party').every((p) => p.downed)) {
    pushLog(state, { t: 'room', outcome: 'wiped' });
    state.activeId = null;
    state.phase = 'ended';
    state.outcome = 'defeat';
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Enemy AI (simple, deterministic): best expected value per Focus; single
// targets: lowest HP (ties random).
// ---------------------------------------------------------------------------
function expectedValue(a: AbilityDef, targets: number): number {
  let v = 0;
  for (const e of a.effects) {
    if (e.kind === 'damage') v += ((e.min + e.max) / 2) * targets;
    if (e.kind === 'status') v += (e.value ?? 3) * e.turns * 0.6 * targets;
  }
  return v;
}

/**
 * Intents (D36): at the start of each round every enemy plans its turn with
 * the Focus it will have, and players see it before acting.
 */
function planEnemyIntents(state: CombatState): void {
  const rng = new Rng(state.rng);
  for (const enemy of on(state, 'enemies')) {
    enemy.intents = [];
    if (enemy.downed || hasStatus(enemy, 'stun')) continue;
    let focus = Math.min(COMBAT_RULES.focusMax, enemy.focus + COMBAT_RULES.focusPerTurn);
    for (let guard = 0; guard < 6; guard++) {
      const options = enemy.abilityIds
        .map((id) => getAbility(id)!)
        .filter((a) => a && a.focusCost <= focus)
        .map((a) => ({ a, targets: validTargets(state, enemy, a) }))
        .filter((o) => o.targets.length > 0);
      if (options.length === 0) break;
      const score = (o: (typeof options)[number]) =>
        expectedValue(o.a, o.a.targeting.area === 'single' ? 1 : o.targets.length) /
        Math.max(1, o.a.focusCost);
      options.sort((x, y) => score(y) - score(x));
      const best = options[0]!;
      let targets = best.targets;
      if (best.a.targeting.area === 'single') {
        const minHp = Math.min(...targets.map((t) => t.hp));
        const weakest = targets.filter((t) => t.hp === minHp);
        targets = [weakest[rng.int(weakest.length)]!];
      }
      enemy.intents.push({ abilityId: best.a.id, targetIds: targets.map((t) => t.id) });
      focus -= best.a.focusCost;
    }
  }
  state.rng = rng.state;
}

/** Targets for a planned intent now; re-target if the planned ones are gone. */
function intentTargets(
  state: CombatState,
  enemy: Combatant,
  a: AbilityDef,
  planned: string[],
  rng: Rng,
): Combatant[] {
  const candidates = validTargets(state, enemy, a);
  if (candidates.length === 0) return [];
  if (a.targeting.area === 'all') return candidates;
  const still = candidates.filter((c) => planned.includes(c.id));
  if (a.targeting.area === 'row') {
    const anchor = still[0] ?? candidates[0]!;
    return candidates.filter((c) => rowOfSlot(c.slot) === rowOfSlot(anchor.slot));
  }
  if (still[0]) return [still[0]];
  const minHp = Math.min(...candidates.map((t) => t.hp));
  const weakest = candidates.filter((t) => t.hp === minHp);
  return [weakest[rng.int(weakest.length)]!];
}

function runEnemyPhase(state: CombatState): void {
  state.phase = 'enemies';
  const rng = new Rng(state.rng);
  const enemies = on(state, 'enemies').filter(alive).sort(byInitiative(state));
  for (const enemy of enemies) {
    if (enemy.downed) continue;
    const intents = enemy.intents;
    enemy.intents = [];
    const canAct = beginTurn(state, enemy);
    if (checkEnd(state)) {
      state.rng = rng.state;
      return;
    }
    if (!canAct) continue;
    for (const intent of intents) {
      const a = getAbility(intent.abilityId);
      if (!a || a.focusCost > enemy.focus || enemy.downed) continue;
      const targets = intentTargets(state, enemy, a, intent.targetIds, rng);
      if (targets.length === 0) continue;
      applyAbility(state, rng, enemy, a, targets);
      if (checkEnd(state)) {
        state.rng = rng.state;
        return;
      }
    }
  }
  state.rng = rng.state;
  startRound(state);
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------
export function applyAction(
  prev: CombatState,
  actorId: string,
  action: CombatAction,
): EngineResult {
  if (prev.phase !== 'party') return fail('INVALID_ACTION', 'Nothing to do right now.');
  if (prev.activeId !== actorId) return fail('NOT_YOUR_TURN', 'It is not your turn.');
  const state: CombatState = structuredClone(prev);
  const actor = get(state, actorId)!;

  if (action.type === 'end_turn') {
    advanceToNextPartyTurn(state);
    return { ok: true, state };
  }
  if (action.type !== 'ability') return fail('INVALID_ACTION', 'Unsupported action.');

  if (!actor.abilityIds.includes(action.abilityId))
    return fail('INVALID_ACTION', 'You do not have that ability.');
  const ability = getAbility(action.abilityId);
  if (!ability) return fail('INVALID_ACTION', 'Unknown ability.');
  if (ability.focusCost > actor.focus) return fail('INVALID_ACTION', 'Not enough Focus.');
  if (ability.manaCost > actor.mana) return fail('INVALID_ACTION', 'Not enough Mana.');

  const rng = new Rng(state.rng);
  if (ability.effects.some((e) => e.kind === 'swap')) {
    const res = swap(state, actor, ability, action.targetSlot);
    if (typeof res === 'string') return fail('INVALID_ACTION', res);
  } else {
    const targets = resolveTargets(state, actor, ability, action.targetId);
    if (typeof targets === 'string') return fail('INVALID_ACTION', targets);
    applyAbility(state, rng, actor, ability, targets);
  }
  state.rng = rng.state;
  checkEnd(state);
  return { ok: true, state };
}

/** Swap Position (D27): costs the actor; swapping with another living player costs them too. */
function swap(
  state: CombatState,
  actor: Combatant,
  ability: AbilityDef,
  targetSlot: number | undefined,
): string | void {
  if (targetSlot === undefined || targetSlot === actor.slot) return 'Choose another slot.';
  const other = on(state, actor.side).find((c) => c.slot === targetSlot);
  const otherPays = other && other.kind === 'player' && !other.downed;
  if (otherPays && other.focus < ability.focusCost)
    return `${other.name} does not have enough Focus to swap.`;
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

/** Turn timer expired (D16): the active player's turn ends. */
export function timeoutTurn(prev: CombatState): CombatState {
  if (prev.phase !== 'party' || !prev.activeId) return prev;
  const state: CombatState = structuredClone(prev);
  pushLog(state, { t: 'timeout', actorId: state.activeId! });
  advanceToNextPartyTurn(state);
  return state;
}
