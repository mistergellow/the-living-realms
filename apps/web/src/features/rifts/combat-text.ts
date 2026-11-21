import { getAbility, STATUS_NAMES } from '@realms/game-core';
import type { CombatLogEntry, CombatView } from '@realms/shared';

/** Human-readable combat log line (English, player-facing). */
export function describeLog(e: CombatLogEntry, combat: CombatView): string | null {
  const name = (id: string | null) => combat.combatants.find((c) => c.id === id)?.name ?? 'Someone';
  switch (e.t) {
    case 'round':
      return `— Round ${e.round} —`;
    case 'initiative':
      return `Initiative ${e.party} vs ${e.enemies}: ${e.first === 'party' ? 'your team' : 'the enemies'} act first.`;
    case 'resolve':
      return null;
    case 'skipped': {
      const a = getAbility(e.abilityId)?.name ?? e.abilityId;
      return `${name(e.actorId)} could not use ${a} (${e.reason}).`;
    }
    case 'ability': {
      const a = getAbility(e.abilityId)?.name ?? e.abilityId;
      const targets = e.targetIds.map(name);
      return targets.length
        ? `${name(e.actorId)} uses ${a} on ${targets.join(', ')}.`
        : `${name(e.actorId)} uses ${a}.`;
    }
    case 'damage':
      return `${name(e.targetId)} takes ${e.amount} damage${e.crit ? ' (critical!)' : ''}${e.blocked ? ` (${e.blocked} dodged)` : ''}.`;
    case 'block':
      return `${name(e.targetId)} gains ${e.amount} Dodge.`;
    case 'status':
      return `${name(e.targetId)} is ${STATUS_NAMES[e.status].toLowerCase()} for ${e.turns} round${e.turns > 1 ? 's' : ''}.`;
    case 'tick':
      return `${name(e.targetId)} suffers ${e.amount} from ${STATUS_NAMES[e.status].toLowerCase()}.`;
    case 'left':
      return `${name(e.actorId)} left the Rift.`;
    case 'stunned':
      return `${name(e.targetId)} is stunned this round.`;
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
      return e.actorId ? `${name(e.actorId)} ran out of time.` : 'Time is up: the round resolves.';
    case 'summon':
      return `${name(e.actorId)} calls ${name(e.unitId)} into the fight!`;
    case 'explode':
      return `${name(e.actorId)} explodes!`;
    case 'room':
      return e.outcome === 'cleared' ? 'The room is clear.' : 'The party has fallen.';
  }
}
