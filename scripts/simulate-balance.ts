/*
 * Balance simulator (dev tool): plays the test Rift many times with a simple
 * bot for typical builds, solo and in groups, and prints win rates. Since
 * request #31 a run is a whole dungeon: the bot walks the branching map
 * (random path), resolves events with the best BASE stat, rests at
 * campsites, and fights with plan → ready rounds.
 *
 *   pnpm sim
 *
 * Targets live in docs/REQUESTS.md (A23). The bot is not a real player: use
 * the numbers to compare builds and spot outliers, not as absolute truth.
 */
import {
  asBaseAttributes,
  availableAbilities,
  availableRooms,
  combatAction,
  computeStats,
  continueRun,
  createRun,
  decisionOptions,
  findNode,
  getAbility,
  getEvent,
  getRift,
  reservedBy,
  targetColumns,
  testChance,
  validTargets,
  vote,
  type AbilityDef,
  type Combatant,
  type CombatState,
  type OwnedItem,
  type RunMember,
  type RunState,
} from '../packages/game-core/src/index.ts';
import type { Attributes, CombatColumn, PlanActionInput } from '../packages/shared/src/index.ts';

const RUNS = Number(process.env.RUNS ?? 300);
const attrs = (o: Partial<Attributes>): Attributes => ({
  might: 5,
  agility: 5,
  precision: 5,
  endurance: 5,
  intellect: 5,
  will: 5,
  ...o,
});

/** Typical 12-point builds, one per starter weapon. */
const BUILDS: Record<string, { attributes: Attributes; main: string; off?: string }> = {
  'sword+shield': {
    attributes: attrs({ might: 10, agility: 8, endurance: 9 }),
    main: 'training_sword',
    off: 'wooden_shield',
  },
  'axe+shield': {
    attributes: attrs({ might: 10, endurance: 10, agility: 7 }),
    main: 'woodcutter_axe',
    off: 'wooden_shield',
  },
  spear: { attributes: attrs({ might: 10, precision: 10, endurance: 7 }), main: 'ash_spear' },
  mace: { attributes: attrs({ might: 10, endurance: 10, agility: 7 }), main: 'iron_mace' },
  'dual dagger': {
    attributes: attrs({ agility: 10, precision: 10, endurance: 7 }),
    main: 'rusty_dagger',
    off: 'rusty_dagger',
  },
  bow: { attributes: attrs({ precision: 10, agility: 9, endurance: 8 }), main: 'hunting_bow' },
  staff: { attributes: attrs({ intellect: 10, will: 9, endurance: 8 }), main: 'apprentice_staff' },
  wand: { attributes: attrs({ intellect: 10, precision: 10, endurance: 7 }), main: 'birch_wand' },
  'tome+talisman': {
    attributes: attrs({ intellect: 9, precision: 8, will: 8, endurance: 7 }),
    main: 'worn_tome',
    off: 'bone_talisman',
  },
};

function party(names: string[]): Array<Omit<RunMember, 'conditions' | 'left'>> {
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
    const backline = ['aimed_shot', 'staff_strike', 'spark', 'wand_bolt'].some((a) =>
      abilityIds.includes(a),
    );
    return {
      characterId: `${name}-${i}`,
      name,
      appearance: { version: 1, color: '#c0392b', emblem: 'circle' } as const,
      baseAttributes: asBaseAttributes(build.attributes),
      attributes,
      stats,
      abilityIds,
      abilityMultipliers: {},
      hp: stats.maxHp,
      mana: stats.maxMana,
      slot: (backline ? [3, 2, 1, 0] : [0, 1, 2, 3])[i % 4]!,
    };
  });
}

const avg = (e: { min: number; max: number }) => (e.min + e.max) / 2;
const has = (t: Combatant, id: string) => t.statuses.some((s) => s.id === id);

/** Heuristic value of an ability against a target group, per Focus. */
function score(
  a: AbilityDef,
  targets: Combatant[],
  canBlock: boolean,
  threatened: boolean,
): number {
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
      if (e.kind === 'block' && canBlock && threatened)
        v += avg(e) * (t.hp < t.maxHp * 0.6 ? 1.6 : 0.9);
    }
  return v / a.focusCost;
}

/** Greedy planner: each player plans the best actions per Focus, then confirms. */
function planRound(run: RunState): RunState {
  let s = run;
  const c = () => s.combat as CombatState;
  for (const m of s.party) {
    const id = `p:${m.characterId}`;
    let blocks = 0;
    for (let guard = 0; guard < 10; guard++) {
      const me = c().combatants.find((u) => u.id === id);
      if (!me || me.downed || me.stunned || c().phase !== 'planning') break;
      const left = me.focus - reservedBy(c(), id).focus;
      const mana = me.mana - reservedBy(c(), id).mana;
      const threatened = c().combatants.some(
        (e) => e.side === 'enemies' && e.intents.some((it) => it.targetIds.includes(id)),
      );
      let best: { value: number; action: PlanActionInput; block: boolean } | null = null;
      for (const abilityId of me.abilityIds) {
        const a = getAbility(abilityId)!;
        if (a.id === 'swap_position' || a.focusCost > left || a.manaCost > mana) continue;
        const options: Array<{ targets: Combatant[]; column?: CombatColumn; targetId?: string }> =
          a.targeting.area === 'column'
            ? targetColumns(c(), me, a).map((x) => ({ targets: x.units, column: x.column }))
            : a.targeting.area === 'all'
              ? [{ targets: validTargets(c(), me, a) }]
              : validTargets(c(), me, a).map((t) => ({ targets: [t], targetId: t.id }));
        for (const o of options) {
          const value = score(a, o.targets, blocks < 2, threatened);
          if (value > 0 && (!best || value > best.value))
            best = {
              value,
              action: { type: 'plan', abilityId, targetId: o.targetId, targetColumn: o.column },
              block: a.effects.some((e) => e.kind === 'block'),
            };
        }
      }
      if (!best) break;
      const r = combatAction(s, m.characterId, best.action);
      if (!r.ok) break;
      s = r.state;
      if (best.block) blocks++;
    }
  }
  for (const m of s.party) {
    if (s.phase !== 'combat' || c().phase !== 'planning') break;
    const r = combatAction(s, m.characterId, { type: 'ready' });
    if (r.ok) s = r.state;
  }
  return s;
}

const rift = getRift('shattered_breach')!;

/** One whole run; returns the outcome and the room type where it ended. */
function playRun(names: string[], seed: number) {
  let s = createRun({ rift, party: party(names), leaderId: `${names[0]}-0`, seed });
  let rng = seed;
  const rand = (n: number) => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng % n;
  };
  let fights = 0;
  for (let guard = 0; guard < 2000 && s.status === 'active'; guard++) {
    if (s.phase === 'map') {
      const options = availableRooms(s);
      const pick = options[rand(options.length)]!;
      for (const m of s.party) {
        const r = vote(s, m.characterId, pick);
        if (r.ok) s = r.state;
      }
      if (['combat', 'elite', 'boss'].includes(findNode(s.map, pick)!.type)) fights++;
    } else if (s.phase === 'combat' && s.combat!.phase === 'planning') s = planRound(s);
    else if (s.phase === 'event' && !s.event!.result) {
      // Best odds approach with the best BASE stat in the party; else the safe one.
      const ev = getEvent(s.event!.eventId)!;
      let best = { id: decisionOptions(s)[0]!, tester: s.party[0]!.characterId, p: 0.5 };
      for (const a of ev.approaches) {
        if (!a.attribute) continue;
        for (const m of s.party) {
          const p = testChance(m.baseAttributes[a.attribute], a.difficulty!);
          if (p > best.p) best = { id: a.id, tester: m.characterId, p };
        }
      }
      if (best.p <= 0.5) best.id = ev.approaches.find((a) => !a.attribute)?.id ?? best.id;
      for (const m of s.party) {
        const r = vote(s, m.characterId, best.id, best.tester);
        if (r.ok) s = r.state;
      }
    } else {
      const r = continueRun(s);
      if (!r.ok) break;
      s = r.state;
    }
  }
  const where = s.currentId ? findNode(s.map, s.currentId)!.type : 'none';
  return { won: s.status === 'victory', where, fights, rooms: s.roomsVisited };
}

function simulate(names: string[], runs = RUNS) {
  let wins = 0;
  let fights = 0;
  const diedIn: Record<string, number> = {};
  for (let seed = 1; seed <= runs; seed++) {
    const r = playRun(names, seed);
    fights += r.fights;
    if (r.won) wins++;
    else diedIn[r.where] = (diedIn[r.where] ?? 0) + 1;
  }
  const pct = (n: number) => `${Math.round((n / runs) * 100)}%`;
  return {
    win: wins / runs,
    line: `win ${pct(wins).padStart(4)}  fights/run ${(fights / runs).toFixed(1)}  died in ${Object.entries(
      diedIn,
    )
      .map(([k, v]) => `${k} ${pct(v)}`)
      .join(', ')}`,
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
  ['axe+shield', 'dual dagger', 'tome+talisman'],
]) {
  console.log(group.join(' + ').padEnd(40), simulate(group, 100).line);
}
