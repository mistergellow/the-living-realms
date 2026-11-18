/*
 * Balance simulator (dev tool): plays the test Rift many times with a simple
 * bot for six typical builds, solo and in groups, and prints win rates.
 *
 *   pnpm sim
 *
 * Targets live in docs/REQUESTS.md (A23). The bot is not a real player: use
 * the numbers to compare builds and spot outliers, not as absolute truth.
 */
import {
  applyAction,
  availableAbilities,
  computeStats,
  createEncounter,
  enterNextRoom,
  getAbility,
  getRift,
  targetColumns,
  validTargets,
  type AbilityDef,
  type Combatant,
  type CombatState,
  type OwnedItem,
  type PartyMemberInput,
} from '../packages/game-core/src/index.ts';
import type { Attributes, CombatAction, CombatColumn } from '../packages/shared/src/index.ts';

const RUNS = Number(process.env.RUNS ?? 300);
const attrs = (o: Partial<Attributes>): Attributes => ({
  might: 5,
  agility: 5,
  precision: 5,
  vitality: 5,
  arcana: 5,
  spirit: 5,
  ...o,
});

/** Typical 12-point builds, one per starter weapon. */
const BUILDS: Record<string, { attributes: Attributes; main: string; off?: string }> = {
  'sword+shield': {
    attributes: attrs({ might: 10, agility: 8, vitality: 9 }),
    main: 'training_sword',
    off: 'wooden_shield',
  },
  axe: { attributes: attrs({ might: 10, vitality: 10, agility: 7 }), main: 'woodcutter_axe' },
  'dual dagger': {
    attributes: attrs({ agility: 10, precision: 10, vitality: 7 }),
    main: 'rusty_dagger',
    off: 'rusty_dagger',
  },
  bow: { attributes: attrs({ precision: 10, agility: 9, vitality: 8 }), main: 'hunting_bow' },
  staff: { attributes: attrs({ arcana: 10, spirit: 9, vitality: 8 }), main: 'apprentice_staff' },
  'tome+talisman': {
    attributes: attrs({ arcana: 9, precision: 8, spirit: 8, vitality: 7 }),
    main: 'worn_tome',
    off: 'bone_talisman',
  },
};

function party(names: string[]): PartyMemberInput[] {
  return names.map((name, i) => {
    const build = BUILDS[name]!;
    const items: OwnedItem[] = [
      { id: 'w', defId: build.main, quality: 100, equippedSlot: 'mainHand' },
      { id: 't', defId: 'padded_tunic', quality: 100, equippedSlot: 'body' },
      ...(build.off
        ? [{ id: 'o', defId: build.off, quality: 100, equippedSlot: 'offHand' as const }]
        : []),
    ];
    const { stats, attributes } = computeStats(build.attributes, items);
    const abilityIds = availableAbilities(items).map((a) => a.ability.id);
    const backline = ['aimed_shot', 'arcane_bolt', 'spark'].some((a) => abilityIds.includes(a));
    return {
      characterId: `${name}-${i}`,
      name,
      appearance: { version: 1, color: '#c0392b', emblem: 'circle' } as const,
      attributes,
      stats,
      abilityIds,
      hp: stats.maxHp,
      mana: stats.maxMana,
      slot: (backline ? [4, 5, 2, 3] : [0, 1, 2, 3])[i % 4]!,
    };
  });
}

const avg = (e: { min: number; max: number }) => (e.min + e.max) / 2;
const has = (t: Combatant, id: string) => t.statuses.some((s) => s.id === id);

/** Heuristic value of an ability against a target group, per Focus. */
function score(a: AbilityDef, targets: Combatant[], canBlock: boolean): number {
  let v = 0;
  for (const t of targets)
    for (const e of a.effects) {
      if (e.kind === 'damage') {
        const mark = has(t, 'mark') ? 1.25 : 1;
        const synergy = e.bonusVs && has(t, e.bonusVs.status) ? e.bonusVs.multiplier : 1;
        const finisher = t.hp < avg(e) * 2 ? 1.5 : 1;
        v += (avg(e) * mark * synergy * finisher) / (t.block > 0 ? 2 : 1);
      }
      if (e.kind === 'status' && !has(t, e.status) && t.hp >= t.maxHp * 0.35)
        v += e.status === 'mark' || e.status === 'weaken' ? 3 : (e.value ?? 0) * e.turns * 0.7;
      if (e.kind === 'heal' && t.hp < t.maxHp * 0.5) v += avg(e) * 3;
      if (e.kind === 'block' && canBlock && t.block === 0)
        v += avg(e) * (t.hp < t.maxHp * 0.6 ? 3 : 1.1);
    }
  return v / a.focusCost;
}

/** Greedy bot: best ability/target per Focus; blocks at most once per turn. */
function bot(start: CombatState): CombatState {
  let s = start;
  let blockedTurn = '';
  for (let guard = 0; guard < 800 && s.phase === 'party'; guard++) {
    const me = s.combatants.find((c) => c.id === s.activeId)!;
    const turn = `${me.id}:${s.round}`;
    let best: { value: number; action: CombatAction; blocks: boolean } | null = null;
    for (const id of me.abilityIds) {
      const a = getAbility(id)!;
      if (a.id === 'swap_position' || a.focusCost > me.focus || a.manaCost > me.mana) continue;
      const options: Array<{ targets: Combatant[]; column?: CombatColumn; targetId?: string }> =
        a.targeting.area === 'column'
          ? targetColumns(s, me, a).map((c) => ({ targets: c.units, column: c.column }))
          : a.targeting.area === 'all'
            ? [{ targets: validTargets(s, me, a) }]
            : validTargets(s, me, a).map((t) => ({ targets: [t], targetId: t.id }));
      for (const o of options) {
        const value = score(a, o.targets, turn !== blockedTurn);
        if (value > 0 && (!best || value > best.value))
          best = {
            value,
            action: {
              type: 'ability',
              abilityId: id,
              targetId: o.targetId,
              targetColumn: o.column,
            },
            blocks: a.effects.some((e) => e.kind === 'block'),
          };
      }
    }
    if (best?.blocks) blockedTurn = turn;
    const r = best ? applyAction(s, me.id, best.action) : null;
    if (r?.ok) s = r.state;
    else {
      const end = applyAction(s, me.id, { type: 'end_turn' });
      if (!end.ok) break;
      s = end.state;
    }
  }
  return s;
}

const rift = getRift('shattered_breach')!;
function simulate(names: string[], runs = RUNS) {
  const diedIn = rift.rooms.map(() => 0);
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    let s = createEncounter({
      party: party(names),
      room: rift.rooms[0]!,
      roomIndex: 0,
      isLastRoom: false,
      seed,
    });
    let room = 0;
    for (;;) {
      s = bot(s);
      if (s.phase !== 'room_cleared') break;
      room++;
      s = enterNextRoom(s, rift.rooms[room]!, room, room === rift.rooms.length - 1);
    }
    if (s.outcome === 'victory') wins++;
    else diedIn[room]!++;
  }
  const pct = (n: number) => `${Math.round((n / runs) * 100)}%`;
  return {
    win: wins / runs,
    line: `win ${pct(wins).padStart(4)}  died per room ${diedIn.map(pct).join(' / ')}`,
  };
}

const solo = Object.keys(BUILDS).map((b) => {
  const r = simulate([b]);
  console.log(b.padEnd(15), r.line);
  return r.win;
});
console.log(`solo average ${Math.round((solo.reduce((a, b) => a + b, 0) / solo.length) * 100)}%`);
for (const group of [
  ['sword+shield', 'bow'],
  ['sword+shield', 'bow', 'staff'],
  ['axe', 'dual dagger', 'tome+talisman'],
]) {
  console.log(group.join(' + ').padEnd(40), simulate(group, 150).line);
}
