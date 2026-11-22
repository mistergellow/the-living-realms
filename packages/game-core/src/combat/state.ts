import type {
  Attributes,
  CharacterAppearance,
  CombatantView,
  CombatLogEntry,
  CombatView,
  DerivedStatsDto,
  GearCombatEffects,
  StatusView,
} from '@realms/shared';
import { ELITE_RULES, getEnemy, type EnemyDef } from '../content/enemies.js';
import type { RiftRoomDef } from '../content/rifts.js';
import { focusPerRound, reductionFromRating } from '../stats.js';

/*
 * Combat rules (decisions D13–D16, D24, D27–D29, D33–D35 and the combat spec
 * of request #31). PROVISIONAL NUMBERS, configurable here:
 * - Focus per round comes from Precision (`FOCUS_RULES` in stats.ts, min 3).
 * - Unspent Focus carries over up to `focusMax` (owner, request #31).
 * - Initiative = roll 1..initiativeDie + Agility; a team uses its best result.
 */
export const COMBAT_RULES = {
  /** Unspent Focus carries over (D24, confirmed in request #31) up to this cap (A16). */
  focusMax: 8,
  /** Initiative roll: 1..initiativeDie, plus Agility (combat spec). */
  initiativeDie: 10,
  /** Seconds to plan a round (D16). */
  turnSeconds: 60,
  reviveHp: 1,
  /** Mark: target takes +25% damage. Weaken: attacker deals −25%. */
  markMultiplier: 1.25,
  weakenMultiplier: 0.75,
  /** Request #53: caps for Mark and Weaken values (percent) from skill levels. */
  maxMarkPct: 100,
  maxWeakenPct: 75,
  /** Safety net: most actions one unit can plan in a round. */
  maxActionsPerRound: 8,
  maxLog: 250,
} as const;

export type Combatant = CombatantView;

export interface CombatState extends Omit<CombatView, 'log'> {
  rng: number;
  logSeq: number;
  /** Summoned units so far (request #44), for their ids. */
  summonSeq?: number;
  log: CombatView['log'];
  tiebreak: Record<string, number>;
  /** This round's individual initiative results (roll + Agility). */
  initiativeRolls: Record<string, number>;
  planSeq: number;
  isLastRoom: boolean;
  /** 'pvp': both sides are players; no revive, last team standing wins. */
  mode?: 'pve' | 'pvp';
}

export interface PartyMemberInput {
  characterId: string;
  name: string;
  appearance: CharacterAppearance;
  /** Total attributes (base + equipment): combat uses them. */
  attributes: Attributes;
  stats: DerivedStatsDto;
  abilityIds: string[];
  /** Weapon upgrade multipliers per ability id. */
  abilityMultipliers?: Record<string, number>;
  /** Skill levels (request #53): extra status turns per ability id. */
  abilityExtraTurns?: Record<string, number>;
  hp: number;
  mana: number;
  slot: number;
  /** Statuses carried in from exploration (e.g. an event debuff). */
  statuses?: StatusView[];
  /** Combat bonuses from gear effects (request #37). */
  gear?: GearCombatEffects;
  /** Exploration boons for the first round. */
  firstRoundFocus?: number;
  firstRoundBlock?: number;
}

export { columnOfSlot } from '@realms/shared';
export const partyId = (characterId: string) => `p:${characterId}`;

function enemyStats(e: EnemyDef, precision: number): DerivedStatsDto {
  return {
    maxHp: e.maxHp,
    maxMana: 0,
    armor: e.armor,
    magicResist: e.magicResist,
    physicalReduction: Math.round(reductionFromRating(e.armor) * 100),
    magicReduction: Math.round(reductionFromRating(e.magicResist) * 100),
    initiative: e.initiative,
    critChance: e.critChance,
    critDamage: 150,
    healingPower: 0,
    healingReceived: 0,
    manaRegen: 0,
    effectPotency: 0,
    focusPerRound: focusPerRound(precision),
  };
}

export function partyCombatant(p: PartyMemberInput, side: Combatant['side'] = 'party'): Combatant {
  return {
    id: partyId(p.characterId),
    side,
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
    focusPerRound: p.stats.focusPerRound,
    left: false,
    block: 0,
    stunned: false,
    statuses: [],
    attributes: p.attributes,
    power: 1,
    abilityMultipliers: p.abilityMultipliers ?? {},
    abilityExtraTurns: p.abilityExtraTurns ?? {},
    intents: [],
    downed: p.hp <= 0,
    isBoss: false,
    abilityIds: p.abilityIds,
    stats: p.stats,
    ...(p.gear ? { gear: p.gear } : {}),
  };
}

/** Extra strength for a fight (e.g. the boss under Dungeon Threat). */
export interface EnemyModifiers {
  hpMultiplier?: number;
  powerMultiplier?: number;
  precisionBonus?: number;
}

export function enemyCombatants(
  room: RiftRoomDef,
  roomIndex: number,
  mods: EnemyModifiers = {},
): Combatant[] {
  return room.enemies.map(({ enemy, slot, elite }, i) =>
    enemyCombatant(enemy, `e:${roomIndex}:${i}`, slot, !!elite, mods),
  );
}

/** One enemy fighter (also used for summons, request #44). */
export function enemyCombatant(
  enemyId: string,
  id: string,
  slot: number,
  elite = false,
  mods: EnemyModifiers = {},
): Combatant {
  const def = getEnemy(enemyId)!;
  const precision =
    (def.precision ?? 5) + (elite ? ELITE_RULES.precisionBonus : 0) + (mods.precisionBonus ?? 0);
  const maxHp = Math.round(
    def.maxHp * (elite ? ELITE_RULES.hpMultiplier : 1) * (mods.hpMultiplier ?? 1),
  );
  const stats = { ...enemyStats(def, precision), maxHp };
  return {
    id,
    side: 'enemies',
    kind: 'enemy',
    name: elite ? `${ELITE_RULES.namePrefix} ${def.name}` : def.name,
    characterId: null,
    appearance: null,
    enemyDefId: def.id,
    slot,
    hp: maxHp,
    maxHp,
    mana: 0,
    maxMana: 0,
    focus: 0,
    focusPerRound: stats.focusPerRound,
    left: false,
    block: 0,
    stunned: false,
    // Innate statuses (e.g. Thorns) last the whole fight.
    statuses: (def.startStatuses ?? []).map((st) => ({ id: st.id, value: st.value, turns: 99 })),
    attributes: null,
    power: def.power * (elite ? ELITE_RULES.powerMultiplier : 1) * (mods.powerMultiplier ?? 1),
    abilityMultipliers: {},
    intents: [],
    downed: false,
    isBoss: !!def.isBoss,
    family: def.family,
    abilityIds: def.abilities,
    stats,
  };
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
    initiative: state.initiative,
    plan: state.plan,
    ready: state.ready,
    combatants: state.combatants,
    outcome: state.outcome,
    log: state.log,
  };
}
