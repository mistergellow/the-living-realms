import type {
  CharacterAppearance,
  CombatantView,
  CombatLogEntry,
  CombatView,
  DerivedStatsDto,
} from '@realms/shared';
import { getEnemy } from '../content/enemies.js';
import type { RiftRoomDef } from '../content/rifts.js';

/*
 * Combat rules (decisions D13–D16, D24, D27–D29). PROVISIONAL NUMBERS.
 */
export const COMBAT_RULES = {
  /** Focus gained at the start of each of a unit's turns. */
  focusPerTurn: 3,
  /** Unspent Focus carries over (D24) up to this cap (provisional, A16). */
  focusMax: 6,
  critMultiplier: 1.5,
  /** Seconds per player turn (D16). */
  turnSeconds: 60,
  /** HP a downed character gets back when the room is cleared (D28). */
  reviveHp: 1,
  maxLog: 200,
} as const;

export type Combatant = CombatantView;

export interface CombatState extends Omit<CombatView, 'log'> {
  rng: number;
  logSeq: number;
  log: CombatView['log'];
  /** Tie-breaker rolled once per combatant. */
  tiebreak: Record<string, number>;
  isLastRoom: boolean;
}

export interface PartyMemberInput {
  characterId: string;
  name: string;
  appearance: CharacterAppearance;
  stats: DerivedStatsDto;
  abilityIds: string[];
  /** Current HP/mana (they persist between rooms, D29). */
  hp: number;
  mana: number;
  slot: number;
}

export const rowOfSlot = (slot: number) => (slot < 3 ? 'front' : 'back');
export const partyId = (characterId: string) => `p:${characterId}`;

const ENEMY_STATS = (e: NonNullable<ReturnType<typeof getEnemy>>): DerivedStatsDto => ({
  maxHp: e.maxHp,
  maxMana: 0,
  defense: e.defense,
  initiative: e.initiative,
  dodgeChance: e.dodgeChance,
  critChance: e.critChance,
  physicalPower: e.physicalPower,
  rangedPower: e.rangedPower,
  spellPower: e.spellPower,
  healingPower: 0,
  resistance: e.resistance,
  manaRegen: 0,
  influence: 0,
});

export function partyCombatant(p: PartyMemberInput): Combatant {
  return {
    id: partyId(p.characterId),
    side: 'party',
    kind: 'player',
    name: p.name,
    characterId: p.characterId,
    appearance: p.appearance,
    enemyDefId: null,
    slot: p.slot,
    hp: Math.min(p.hp, p.stats.maxHp),
    maxHp: p.stats.maxHp,
    mana: Math.min(p.mana, p.stats.maxMana),
    maxMana: p.stats.maxMana,
    focus: 0,
    downed: p.hp <= 0,
    isBoss: false,
    abilityIds: p.abilityIds,
    stats: p.stats,
  };
}

export function enemyCombatants(room: RiftRoomDef, roomIndex: number): Combatant[] {
  return room.enemies.map(({ enemy, slot }, i) => {
    const def = getEnemy(enemy)!;
    return {
      id: `e:${roomIndex}:${i}`,
      side: 'enemies',
      kind: 'enemy',
      name: def.name,
      characterId: null,
      appearance: null,
      enemyDefId: def.id,
      slot,
      hp: def.maxHp,
      maxHp: def.maxHp,
      mana: 0,
      maxMana: 0,
      focus: 0,
      downed: false,
      isBoss: !!def.isBoss,
      abilityIds: def.abilities,
      stats: ENEMY_STATS(def),
    };
  });
}

export function pushLog(state: CombatState, entry: CombatLogEntry): void {
  state.log.push({ ...entry, seq: ++state.logSeq });
  if (state.log.length > COMBAT_RULES.maxLog)
    state.log.splice(0, state.log.length - COMBAT_RULES.maxLog);
}

/** Public view: everything except the RNG internals. */
export function toCombatView(state: CombatState): CombatView {
  return {
    round: state.round,
    phase: state.phase,
    activeId: state.activeId,
    turnOrder: state.turnOrder,
    combatants: state.combatants,
    outcome: state.outcome,
    log: state.log,
  };
}
