import type {
  Attributes,
  CharacterAppearance,
  CombatantView,
  CombatLogEntry,
  CombatView,
  DerivedStatsDto,
} from '@realms/shared';
import { getEnemy, type EnemyDef } from '../content/enemies.js';
import type { RiftRoomDef } from '../content/rifts.js';
import { reductionFromRating } from '../stats.js';

/*
 * Combat rules (decisions D13–D16, D24, D27–D29, D33–D35). PROVISIONAL NUMBERS.
 */
export const COMBAT_RULES = {
  focusPerTurn: 3,
  /** Unspent Focus carries over (D24) up to this cap (A16). */
  focusMax: 6,
  turnSeconds: 60,
  reviveHp: 1,
  /** Mark: target takes +25% damage. Weaken: attacker deals −25%. */
  markMultiplier: 1.25,
  weakenMultiplier: 0.75,
  maxLog: 250,
} as const;

export type Combatant = CombatantView;

export interface CombatState extends Omit<CombatView, 'log'> {
  rng: number;
  logSeq: number;
  log: CombatView['log'];
  tiebreak: Record<string, number>;
  isLastRoom: boolean;
}

export interface PartyMemberInput {
  characterId: string;
  name: string;
  appearance: CharacterAppearance;
  attributes: Attributes;
  stats: DerivedStatsDto;
  abilityIds: string[];
  hp: number;
  mana: number;
  slot: number;
}

export const rowOfSlot = (slot: number) => (slot < 3 ? 'front' : 'back');
export const partyId = (characterId: string) => `p:${characterId}`;

function enemyStats(e: EnemyDef): DerivedStatsDto {
  return {
    maxHp: e.maxHp,
    maxMana: 0,
    armor: e.armor,
    magicResist: e.magicResist,
    physicalReduction: Math.round(reductionFromRating(e.armor) * 100),
    magicReduction: Math.round(reductionFromRating(e.magicResist) * 100),
    initiative: e.initiative,
    dodgeChance: e.dodgeChance,
    critChance: e.critChance,
    critDamage: 150,
    healingPower: 0,
    healingReceived: 0,
    manaRegen: 0,
    effectPotency: 0,
  };
}

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
    block: 0,
    statuses: [],
    attributes: p.attributes,
    power: 1,
    intents: [],
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
      block: 0,
      statuses: [],
      attributes: null,
      power: def.power,
      intents: [],
      downed: false,
      isBoss: !!def.isBoss,
      abilityIds: def.abilities,
      stats: enemyStats(def),
    };
  });
}

export function pushLog(state: CombatState, entry: CombatLogEntry): void {
  state.log.push({ ...entry, seq: ++state.logSeq });
  if (state.log.length > COMBAT_RULES.maxLog)
    state.log.splice(0, state.log.length - COMBAT_RULES.maxLog);
}

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
