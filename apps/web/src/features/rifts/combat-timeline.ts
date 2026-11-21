import { getAbility } from '@realms/game-core';
import type { CombatLogEntry, StatusId } from '@realms/shared';

/*
 * Turns new combat log entries into animation steps (pure, no Pixi).
 * One step per ability used, so an enemy phase with several attacks plays
 * out one by one; damage/heal/dodge/downed entries that follow an ability
 * belong to its step and are shown at the moment of impact.
 */

/** How an action looks on screen. */
export type FxKind = 'melee' | 'ranged' | 'magic' | 'heal' | 'guard' | 'swap' | 'none';

export type FxEvent =
  | { t: 'damage'; targetId: string; amount: number; crit: boolean; blocked: number }
  | { t: 'block'; targetId: string; amount: number }
  | { t: 'status'; targetId: string; status: StatusId; turns: number }
  | { t: 'tick'; targetId: string; status: StatusId; amount: number }
  | { t: 'stunned'; targetId: string }
  | { t: 'heal'; targetId: string; amount: number }
  | { t: 'downed'; targetId: string }
  | { t: 'revived'; targetId: string; hp: number };

export interface FxStep {
  actorId: string | null;
  abilityId: string | null;
  kind: FxKind;
  targetIds: string[];
  events: FxEvent[];
  /** Highest log sequence number this step covers (0 if unknown). */
  seq: number;
}

export function abilityFxKind(abilityId: string): FxKind {
  const a = getAbility(abilityId);
  if (!a) return 'melee';
  // The first damage effect decides; otherwise heal, block, then status/swap.
  const dmg = a.effects.find((e) => e.kind === 'damage');
  if (dmg && dmg.kind === 'damage')
    return dmg.damageType === 'physical'
      ? 'melee'
      : dmg.damageType === 'ranged'
        ? 'ranged'
        : 'magic';
  if (a.effects.some((e) => e.kind === 'heal')) return 'heal';
  if (a.effects.some((e) => e.kind === 'block')) return 'guard';
  if (a.effects.some((e) => e.kind === 'status'))
    return a.targeting.side === 'enemy' ? 'magic' : 'guard';
  if (a.effects.some((e) => e.kind === 'swap')) return 'swap';
  return 'none';
}

export function buildTimeline(entries: ReadonlyArray<CombatLogEntry & { seq?: number }>): FxStep[] {
  const steps: FxStep[] = [];
  const current = (): FxStep => {
    const last = steps[steps.length - 1];
    if (last) return last;
    const s: FxStep = {
      actorId: null,
      abilityId: null,
      kind: 'none',
      targetIds: [],
      events: [],
      seq: 0,
    };
    steps.push(s);
    return s;
  };
  for (const e of entries) {
    switch (e.t) {
      case 'ability':
        steps.push({
          actorId: e.actorId,
          abilityId: e.abilityId,
          kind: abilityFxKind(e.abilityId),
          targetIds: [...e.targetIds],
          events: [],
          seq: 0,
        });
        break;
      case 'swap': {
        const last = steps[steps.length - 1];
        if (!(last && last.kind === 'swap' && last.actorId === e.actorId))
          steps.push({
            actorId: e.actorId,
            abilityId: null,
            kind: 'swap',
            targetIds: e.withId ? [e.withId] : [],
            events: [],
            seq: 0,
          });
        break;
      }
      case 'damage':
        current().events.push({
          t: 'damage',
          targetId: e.targetId,
          amount: e.amount,
          crit: e.crit,
          blocked: e.blocked ?? 0,
        });
        break;
      case 'block':
        current().events.push({ t: 'block', targetId: e.targetId, amount: e.amount });
        break;
      case 'status':
        current().events.push({
          t: 'status',
          targetId: e.targetId,
          status: e.status,
          turns: e.turns,
        });
        break;
      case 'tick':
        current().events.push({
          t: 'tick',
          targetId: e.targetId,
          status: e.status,
          amount: e.amount,
        });
        break;
      case 'stunned':
        current().events.push({ t: 'stunned', targetId: e.targetId });
        break;
      case 'heal':
        current().events.push({ t: 'heal', targetId: e.targetId, amount: e.amount });
        break;
      case 'downed':
        current().events.push({ t: 'downed', targetId: e.targetId });
        break;
      case 'revived':
        current().events.push({ t: 'revived', targetId: e.targetId, hp: e.hp });
        break;
      default:
        break; // round, turn, timeout, room: no animation
    }
    const last = steps[steps.length - 1];
    if (last && e.seq !== undefined) last.seq = Math.max(last.seq, e.seq);
  }
  return steps.filter((s) => s.kind !== 'none' || s.events.length > 0);
}

/** Displayed HP/downed state of each unit, replayed step by step. */
export type ShownState = Record<string, { hp: number; maxHp: number; downed: boolean }>;

/** Applies one step's events to the displayed state (returns a new object). */
export function applyStep(state: ShownState, step: FxStep): ShownState {
  const next: ShownState = {};
  for (const [id, s] of Object.entries(state)) next[id] = { ...s };
  for (const e of step.events) {
    const u = next[e.targetId];
    if (!u) continue;
    if (e.t === 'damage' || e.t === 'tick') u.hp = Math.max(0, u.hp - e.amount);
    else if (e.t === 'heal') u.hp = Math.min(u.maxHp, u.hp + e.amount);
    else if (e.t === 'downed') {
      u.downed = true;
      u.hp = 0;
    } else if (e.t === 'revived') {
      u.downed = false;
      u.hp = e.hp;
    }
  }
  return next;
}
