import type { CombatAction } from '@realms/shared';
import { getAbility, type AbilityDef } from '../content/abilities.js';
import type { RiftRoomDef } from '../content/rifts.js';
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
 * PvE round (decision D14): party members act one at a time by initiative;
 * then every enemy acts (AI). Each unit gains Focus at the start of its turn
 * and may use several abilities while Focus lasts (D15/D24).
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
    ...on(state, 'party').map((c) => ({ ...c, focus: 0 })),
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
  advanceToNextPartyTurn(state);
}

function beginTurn(state: CombatState, unit: Combatant): void {
  unit.focus = Math.min(COMBAT_RULES.focusMax, unit.focus + COMBAT_RULES.focusPerTurn);
  unit.mana = Math.min(unit.maxMana, unit.mana + unit.stats.manaRegen);
  pushLog(state, { t: 'turn', actorId: unit.id });
}

function advanceToNextPartyTurn(state: CombatState): void {
  const order = state.turnOrder;
  let idx = state.activeId ? order.indexOf(state.activeId) + 1 : 0;
  while (idx < order.length) {
    const unit = get(state, order[idx]!);
    if (unit && alive(unit)) {
      state.activeId = unit.id;
      beginTurn(state, unit);
      return;
    }
    idx++;
  }
  state.activeId = null;
  runEnemyPhase(state);
}

const get = (state: CombatState, id: string) => state.combatants.find((c) => c.id === id);

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

  for (const effect of ability.effects) {
    for (const target of targets) {
      if (target.downed) continue;
      if (effect.kind === 'damage') {
        if (effect.damageType !== 'magic' && rng.chance(target.stats.dodgeChance)) {
          pushLog(state, { t: 'dodge', targetId: target.id });
          continue;
        }
        const power =
          effect.damageType === 'physical'
            ? actor.stats.physicalPower
            : effect.damageType === 'ranged'
              ? actor.stats.rangedPower
              : actor.stats.spellPower;
        let raw = Math.max(1, effect.base + power);
        const crit = rng.chance(actor.stats.critChance);
        if (crit) raw = Math.floor(raw * COMBAT_RULES.critMultiplier);
        const mitigation =
          effect.damageType === 'magic'
            ? Math.max(0, target.stats.resistance)
            : target.stats.defense;
        const amount = Math.max(1, raw - mitigation);
        target.hp = Math.max(0, target.hp - amount);
        pushLog(state, { t: 'damage', targetId: target.id, amount, crit });
        if (target.hp === 0) {
          target.downed = true;
          target.focus = 0;
          pushLog(state, { t: 'downed', targetId: target.id });
        }
      } else if (effect.kind === 'heal') {
        const amount = Math.min(
          target.maxHp - target.hp,
          Math.max(1, effect.base + actor.stats.healingPower),
        );
        target.hp += amount;
        pushLog(state, { t: 'heal', targetId: target.id, amount });
      }
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
// Enemy AI (simple, deterministic): greedily use the affordable ability with
// the highest total base effect; single targets: lowest HP (ties random).
// ---------------------------------------------------------------------------
function runEnemyPhase(state: CombatState): void {
  state.phase = 'enemies';
  const rng = new Rng(state.rng);
  const enemies = on(state, 'enemies').filter(alive).sort(byInitiative(state));
  for (const enemy of enemies) {
    if (enemy.downed) continue;
    beginTurn(state, enemy);
    for (let guard = 0; guard < 10; guard++) {
      const options = enemy.abilityIds
        .map((id) => getAbility(id)!)
        .filter((a) => a && a.focusCost <= enemy.focus && a.manaCost <= enemy.mana)
        .map((a) => ({ a, targets: validTargets(state, enemy, a) }))
        .filter((o) => o.targets.length > 0);
      if (options.length === 0) break;
      const score = (o: (typeof options)[number]) => {
        const base = o.a.effects.reduce((s, e) => s + ('base' in e ? e.base : 0), 0);
        const hits = o.a.targeting.area === 'single' ? 1 : o.targets.length;
        return base * hits;
      };
      options.sort((x, y) => score(y) - score(x));
      const best = options[0]!;
      let targets = best.targets;
      if (best.a.targeting.area === 'single') {
        const minHp = Math.min(...targets.map((t) => t.hp));
        const weakest = targets.filter((t) => t.hp === minHp);
        targets = [weakest[rng.int(weakest.length)]!];
      }
      applyAbility(state, rng, enemy, best.a, targets);
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

/** Party members' HP/mana to persist after the encounter. */
export function partyVitals(state: CombatState) {
  return on(state, 'party').map((c) => ({ id: c.id, hp: c.hp, mana: c.mana, slot: c.slot }));
}
