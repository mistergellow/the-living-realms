import { getAbility, STATUS_NAMES } from '@realms/game-core';
import type { CombatLogEntry, CombatView } from '@realms/shared';

/** Human-readable combat log line (English, player-facing). */
export function describeLog(e: CombatLogEntry, combat: CombatView): string | null {
  const name = (id: string | null) => combat.combatants.find((c) => c.id === id)?.name ?? 'Someone';
  switch (e.t) {
    case 'round':
      return `— Round ${e.round} —`;
    case 'ability': {
      const a = getAbility(e.abilityId)?.name ?? e.abilityId;
      const targets = e.targetIds.map(name);
      return targets.length
        ? `${name(e.actorId)} uses ${a} on ${targets.join(', ')}.`
        : `${name(e.actorId)} uses ${a}.`;
    }
    case 'damage':
      return `${name(e.targetId)} takes ${e.amount} damage${e.crit ? ' (critical!)' : ''}${e.blocked ? ` (${e.blocked} blocked)` : ''}.`;
    case 'block':
      return `${name(e.targetId)} gains ${e.amount} Block.`;
    case 'status':
      return `${name(e.targetId)} is ${STATUS_NAMES[e.status].toLowerCase()} for ${e.turns} turn${e.turns > 1 ? 's' : ''}.`;
    case 'tick':
      return `${name(e.targetId)} suffers ${e.amount} from ${STATUS_NAMES[e.status].toLowerCase()}.`;
    case 'stunned':
      return `${name(e.targetId)} is stunned and loses the turn.`;
    case 'dodge':
      return `${name(e.targetId)} dodges.`;
    case 'heal':
      return `${name(e.targetId)} recovers ${e.amount} HP.`;
    case 'swap':
      return e.withId
        ? `${name(e.actorId)} swaps places with ${name(e.withId)}.`
        : `${name(e.actorId)} moves.`;
    case 'downed':
      return `${name(e.targetId)} falls!`;
    case 'revived':
      return `${name(e.targetId)} gets back up with ${e.hp} HP.`;
    case 'timeout':
      return `${name(e.actorId)} ran out of time.`;
    case 'room':
      return e.outcome === 'cleared' ? 'The room is clear.' : 'The party has fallen.';
    case 'turn':
      return null;
  }
}
