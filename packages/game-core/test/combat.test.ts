import type { DerivedStatsDto, PlanActionInput } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  absorbWithBlock,
  BASIC_ACTIONS,
  COMBAT_RULES,
  computeStats,
  createEncounter,
  focusPerRound,
  FOCUS_RULES,
  getAbility,
  leaveParty,
  planAction,
  reservedBy,
  setReady,
  timeoutTurn,
  unplanAction,
  validTargets,
  type CombatState,
  type EngineResult,
  type PartyMemberInput,
  type RiftRoomDef,
} from '../src/index.js';

const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;
const baseAttributes = { might: 9, agility: 6, precision: 5, endurance: 9, intellect: 5, will: 5 };
const baseStats = computeStats(baseAttributes).stats;

function member(
  id: string,
  slot: number,
  over: Partial<DerivedStatsDto> = {},
  abilityIds = ['slash', 'cleave', 'block', 'swap_position'],
): PartyMemberInput {
  const stats = { ...baseStats, ...over };
  return {
    characterId: id,
    name: id,
    appearance,
    attributes: baseAttributes,
    stats,
    abilityIds,
    hp: stats.maxHp,
    mana: stats.maxMana,
    slot,
  };
}

const room = (enemies: RiftRoomDef['enemies']): RiftRoomDef => ({ name: 'Test', enemies });
const encounter = (party: PartyMemberInput[], r: RiftRoomDef, isLastRoom = false, seed = 42) =>
  createEncounter({ party, room: r, roomIndex: 0, isLastRoom, seed });
const unit = (s: CombatState, id: string) => s.combatants.find((c) => c.id === id)!;
const ok = (r: EngineResult) => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};
const plan = (s: CombatState, id: string, a: Omit<PlanActionInput, 'type'>) =>
  ok(planAction(s, id, { type: 'plan', ...a }));
/** Make enemies harmless and predictable for a test. */
function calm(s: CombatState): CombatState {
  for (const c of s.combatants) {
    c.stats = { ...c.stats, dodgeChance: 0, critChance: 0 };
    if (c.side === 'enemies') c.intents = [];
  }
  return s;
}
const actors = (s: CombatState, fromSeq: number) =>
  s.log
    .filter((l) => l.seq > fromSeq && l.t === 'ability')
    .map((l) => (l as { actorId: string }).actorId);

describe('Focus (Precision)', () => {
  it('every character generates at least 3; Precision adds more, up to a cap', () => {
    expect(focusPerRound(1)).toBe(FOCUS_RULES.minimum);
    expect(focusPerRound(5)).toBe(3);
    expect(focusPerRound(7)).toBe(4);
    expect(focusPerRound(9)).toBe(5);
    expect(focusPerRound(11)).toBe(6);
    expect(focusPerRound(30)).toBe(FOCUS_RULES.maxPerRound);
    expect(computeStats({ ...baseAttributes, precision: 9 }).stats.focusPerRound).toBe(5);
  });

  it('is generated individually at the start of every round; unspent Focus carries over to a cap', () => {
    let s = encounter(
      [
        member('slow', 0, { focusPerRound: 3, maxHp: 999 }),
        member('sharp', 1, { focusPerRound: 5, maxHp: 999 }),
      ],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    expect(unit(s, 'p:slow').focus).toBe(3);
    expect(unit(s, 'p:sharp').focus).toBe(5);
    s = ok(setReady(calm(s), 'p:slow'));
    s = ok(setReady(s, 'p:sharp'));
    expect(s.round).toBe(2);
    expect(unit(s, 'p:slow').focus).toBe(6);
    expect(unit(s, 'p:sharp').focus).toBe(COMBAT_RULES.focusMax);
  });

  it('enemies generate Focus from Precision too', () => {
    const s = encounter([member('a', 0)], room([{ enemy: 'rift_warden', slot: 0 }]));
    const warden = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    expect(warden.focusPerRound).toBe(focusPerRound(7));
    expect(warden.focus).toBe(focusPerRound(7));
  });
});

describe('planning phase', () => {
  it('players plan actions first; nothing resolves until everyone is ready', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_husk', slot: 0 }]));
    expect(s.phase).toBe('planning');
    s = plan(s, 'p:a', { abilityId: 'slash' });
    expect(s.plan).toHaveLength(1);
    expect(s.plan[0]).toMatchObject({ actorId: 'p:a', abilityId: 'slash', targetColumn: 'front' });
    expect(s.log.some((l) => l.t === 'ability')).toBe(false);
    s = ok(setReady(s, 'p:a'));
    expect(s.round).toBe(1);
    s = ok(setReady(s, 'p:b'));
    expect(s.round).toBe(2);
    expect(s.log.some((l) => l.t === 'ability' && l.actorId === 'p:a')).toBe(true);
  });

  it('cannot plan more than the Focus (and Mana) available; reserved Focus counts', () => {
    let s = encounter(
      [member('a', 0, { focusPerRound: 3 })],
      room([{ enemy: 'rift_husk', slot: 0 }]),
    );
    s = plan(s, 'p:a', { abilityId: 'cleave' }); // 2
    expect(reservedBy(s, 'p:a').focus).toBe(2);
    const poor = planAction(s, 'p:a', { type: 'plan', abilityId: 'cleave' });
    expect(poor).toMatchObject({ ok: false, reason: 'Not enough Focus.' });
    s = plan(s, 'p:a', { abilityId: 'slash' }); // 1 → 3 used
    expect(planAction(s, 'p:a', { type: 'plan', abilityId: 'block' }).ok).toBe(false);
    // Removing a planned action frees its Focus.
    s = ok(unplanAction(s, 'p:a', s.plan[0]!.id));
    expect(planAction(s, 'p:a', { type: 'plan', abilityId: 'block' }).ok).toBe(true);
  });

  it('a confirmed plan cannot be changed; others cannot remove your actions', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_husk', slot: 0 }]));
    s = plan(s, 'p:a', { abilityId: 'slash' });
    expect(unplanAction(s, 'p:b', s.plan[0]!.id).ok).toBe(false);
    s = ok(setReady(s, 'p:a'));
    expect(planAction(s, 'p:a', { type: 'plan', abilityId: 'block' }).ok).toBe(false);
  });

  it('the planning timer resolves whatever was planned', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_husk', slot: 0 }]));
    s = plan(s, 'p:a', { abilityId: 'slash' });
    const t = timeoutTurn(s);
    expect(t.round).toBe(2);
    expect(t.log.some((l) => l.t === 'timeout')).toBe(true);
    expect(t.log.some((l) => l.t === 'ability' && l.actorId === 'p:a')).toBe(true);
  });
});

describe('initiative and alternating resolution', () => {
  it('team initiative = best (roll + Agility) of each side; it decides who starts', () => {
    const s = encounter(
      [member('a', 0, { initiative: 100 }), member('b', 1, { initiative: 0 })],
      room([{ enemy: 'rift_husk', slot: 0 }]),
    );
    expect(s.initiative!.first).toBe('party');
    expect(s.initiative!.party).toBeGreaterThan(100);
    const r = s.log.find((l) => l.t === 'initiative');
    expect(r).toMatchObject({ first: 'party' });
  });

  it('actions alternate between teams, each team in planned order; the longer queue finishes', () => {
    let s = encounter(
      [
        member('a', 0, { initiative: 100, maxHp: 999, focusPerRound: 3 }),
        member('b', 1, { maxHp: 999 }),
      ],
      room([
        { enemy: 'rift_warden', slot: 0 },
        { enemy: 'rift_bulwark', slot: 1 },
      ]),
    );
    s = calm(s);
    const warden = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    warden.intents = [{ abilityId: 'warden_slam', targetIds: [], column: 'front' }];
    // Planned order: b, a, a — not initiative order.
    s = plan(s, 'p:b', { abilityId: 'slash' });
    s = plan(s, 'p:a', { abilityId: 'slash' });
    s = plan(s, 'p:a', { abilityId: 'slash' });
    const seq = s.logSeq;
    s = ok(setReady(s, 'p:a'));
    s = ok(setReady(s, 'p:b'));
    expect(actors(s, seq)).toEqual(['p:b', warden.id, 'p:a', 'p:a']);
  });

  it('the enemies start when they win initiative', () => {
    let s = encounter(
      [member('a', 0, { initiative: -100, maxHp: 999 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    expect(s.initiative!.first).toBe('enemies');
    s = calm(s);
    const warden = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    warden.intents = [{ abilityId: 'warden_slam', targetIds: [], column: 'front' }];
    s = plan(s, 'p:a', { abilityId: 'slash' });
    const seq = s.logSeq;
    s = ok(setReady(s, 'p:a'));
    expect(actors(s, seq)).toEqual([warden.id, 'p:a']);
  });

  it('a character defeated before their action does not act', () => {
    let s = encounter(
      [member('a', 0, { initiative: -100, maxHp: 10 }), member('b', 4, { maxHp: 999 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    s = calm(s);
    unit(s, 'p:a').hp = 1;
    const warden = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    warden.intents = [{ abilityId: 'warden_slam', targetIds: [], column: 'front' }];
    s.initiative = { party: 0, enemies: 99, first: 'enemies' };
    s = plan(s, 'p:a', { abilityId: 'slash' });
    s = ok(setReady(s, 'p:a'));
    s = ok(setReady(s, 'p:b'));
    expect(unit(s, 'p:a').downed).toBe(true);
    expect(s.log.some((l) => l.t === 'skipped' && l.actorId === 'p:a')).toBe(true);
    expect(s.log.some((l) => l.t === 'ability' && l.actorId === 'p:a')).toBe(false);
  });
});

describe('Block', () => {
  it('absorbs damage before HP (spec examples)', () => {
    expect(absorbWithBlock(10, 5)).toEqual({ toHp: 5, blocked: 5, blockLeft: 0 });
    expect(absorbWithBlock(5, 10)).toEqual({ toHp: 0, blocked: 5, blockLeft: 5 });
  });

  it('costs 1 Focus, stacks, and is removed when the next round begins', () => {
    let s = encounter([member('a', 0, { maxHp: 999 })], room([{ enemy: 'rift_warden', slot: 0 }]));
    s = calm(s);
    expect(getAbility('block')!.focusCost).toBe(BASIC_ACTIONS.block.focusCost);
    s = plan(s, 'p:a', { abilityId: 'block' });
    s = plan(s, 'p:a', { abilityId: 'block' });
    const seq = s.logSeq;
    s = ok(setReady(s, 'p:a'));
    const gains = s.log.filter((l) => l.seq > seq && l.t === 'block');
    expect(gains.map((g) => (g as { amount: number }).amount)).toEqual([
      BASIC_ACTIONS.block.amount,
      BASIC_ACTIONS.block.amount,
    ]);
    expect(unit(s, 'p:a').block).toBe(0); // new round
  });

  it('blocked damage is reported and Block shields HP within the round', () => {
    let s = encounter(
      [member('a', 0, { maxHp: 999, armor: 0, physicalReduction: 0, initiative: 100 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    s = calm(s);
    const warden = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    warden.intents = [{ abilityId: 'warden_slam', targetIds: [], column: 'front' }];
    s.initiative = { party: 99, enemies: 0, first: 'party' };
    s = plan(s, 'p:a', { abilityId: 'block' });
    s = plan(s, 'p:a', { abilityId: 'block' });
    s = ok(setReady(s, 'p:a'));
    const hit = s.log.find((l) => l.t === 'damage' && l.targetId === 'p:a') as
      { blocked: number; amount: number } | undefined;
    expect(hit!.blocked).toBeGreaterThan(0);
  });
});

describe('targeting by columns (front, mid, back × 2 lines)', () => {
  const threeColumns = room([
    { enemy: 'rift_husk', slot: 1 }, // front
    { enemy: 'hollow_hound', slot: 2 }, // mid
    { enemy: 'shard_spitter', slot: 4 }, // back
  ]);
  const ids = (s: CombatState, ability: string) =>
    validTargets(s, unit(s, 'p:a'), getAbility(ability)!).map((c) => c.enemyDefId);

  it('melee hits the first occupied column: front, then mid, then back', () => {
    const s = encounter([member('a', 0)], threeColumns);
    expect(ids(s, 'slash')).toEqual(['rift_husk']);
    const noFront = structuredClone(s);
    noFront.combatants.find((c) => c.enemyDefId === 'rift_husk')!.downed = true;
    expect(ids(noFront, 'slash')).toEqual(['hollow_hound']);
    noFront.combatants.find((c) => c.enemyDefId === 'hollow_hound')!.downed = true;
    expect(ids(noFront, 'slash')).toEqual(['shard_spitter']);
  });

  it('the spear reaches the two nearest columns', () => {
    const s = encounter([member('a', 0, {}, ['thrust'])], threeColumns);
    expect(ids(s, 'thrust')).toEqual(['rift_husk', 'hollow_hound']);
  });

  it('ranged reaches any column; Volley hits everyone', () => {
    const s = encounter([member('a', 0, {}, ['aimed_shot', 'volley'])], threeColumns);
    expect(ids(s, 'volley')).toHaveLength(3);
    expect(ids(s, 'aimed_shot')).toHaveLength(3);
  });

  it('attacks pick a column and hit both units in it (D41); out of reach is rejected', () => {
    let s = encounter(
      [member('a', 0, { critChance: 0 }, ['aimed_shot', 'slash'])],
      room([
        { enemy: 'rift_husk', slot: 0 },
        { enemy: 'shard_spitter', slot: 4 },
        { enemy: 'shard_spitter', slot: 5 },
      ]),
    );
    s = calm(s);
    expect(
      planAction(s, 'p:a', { type: 'plan', abilityId: 'slash', targetColumn: 'back' }).ok,
    ).toBe(false);
    s = plan(s, 'p:a', { abilityId: 'aimed_shot', targetColumn: 'back' });
    s = ok(setReady(s, 'p:a'));
    const hit = s.log
      .filter((l) => l.t === 'damage')
      .map((l) => (l as { targetId: string }).targetId);
    expect(hit).toEqual(['e:0:1', 'e:0:2']);
  });
});

describe('change position', () => {
  it('moving to an empty slot costs 1 Focus for the actor only', () => {
    let s = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]));
    s = calm(s);
    expect(getAbility('swap_position')!.focusCost).toBe(BASIC_ACTIONS.changePosition.focusCost);
    s = plan(s, 'p:a', { abilityId: 'swap_position', targetSlot: 4 });
    s = ok(setReady(s, 'p:a'));
    expect(unit(s, 'p:a').slot).toBe(4);
    expect(unit(s, 'p:a').focus).toBe(Math.min(COMBAT_RULES.focusMax, 3 - 1 + 3));
  });

  it('swapping with another player costs Focus for both (reserved while planning)', () => {
    let s = encounter(
      [member('a', 0, { focusPerRound: 3 }), member('b', 3, { focusPerRound: 3 })],
      room([{ enemy: 'rift_husk', slot: 0 }]),
    );
    s = calm(s);
    s = plan(s, 'p:b', { abilityId: 'cleave' });
    s = plan(s, 'p:b', { abilityId: 'slash' }); // b has 0 left
    expect(
      planAction(s, 'p:a', { type: 'plan', abilityId: 'swap_position', targetSlot: 3 }).ok,
    ).toBe(false);
    s = ok(unplanAction(s, 'p:b', s.plan[1]!.id));
    s = plan(s, 'p:a', { abilityId: 'swap_position', targetSlot: 3 });
    expect(reservedBy(s, 'p:b').focus).toBe(3);
  });
});

describe('statuses by round', () => {
  it('bleed ticks when a round begins and counts down', () => {
    let s = encounter([member('a', 0, { maxHp: 999 })], room([{ enemy: 'rift_warden', slot: 0 }]));
    s = calm(s);
    unit(s, 'p:a').statuses.push({ id: 'bleed', turns: 2, value: 4 });
    s = ok(setReady(s, 'p:a'));
    expect(s.log.some((l) => l.t === 'tick' && l.targetId === 'p:a')).toBe(true);
    expect(unit(s, 'p:a').statuses[0]!.turns).toBe(1);
  });

  it('a stunned character cannot plan that round', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_warden', slot: 0 }]));
    s = calm(s);
    unit(s, 'p:b').statuses.push({ id: 'stun', turns: 1, value: 0 });
    s = ok(setReady(s, 'p:a'));
    s = ok(setReady(s, 'p:b'));
    expect(unit(s, 'p:b').stunned).toBe(true);
    expect(planAction(s, 'p:b', { type: 'plan', abilityId: 'slash' })).toMatchObject({
      ok: false,
      code: 'NOT_YOUR_TURN',
    });
  });
});

describe('enemy intents', () => {
  it('enemies show what they will do while players plan, then do it', () => {
    let s = encounter([member('a', 0, { maxHp: 500 })], room([{ enemy: 'rift_husk', slot: 0 }]));
    const husk = s.combatants.find((c) => c.side === 'enemies')!;
    expect(husk.intents[0]).toEqual({
      abilityId: 'husk_claw',
      targetIds: ['p:a'],
      column: 'front',
    });
    const planned = husk.intents.length;
    expect(planned).toBe(husk.focus); // 1 Focus each
    s = ok(setReady(s, 'p:a'));
    const used = s.log.filter((l) => l.t === 'ability' && l.actorId === husk.id);
    expect(used).toHaveLength(planned);
    expect(s.combatants.find((c) => c.id === husk.id)!.intents.length).toBeGreaterThan(0);
  });

  it('a Bulwark sharing a column with an attacker shields it; the attacker hits the column (D42)', () => {
    const s = encounter(
      [member('a', 0), member('b', 1)],
      room([
        { enemy: 'rift_bulwark', slot: 0 },
        { enemy: 'rift_husk', slot: 1 },
      ]),
    );
    const bulwark = s.combatants.find((c) => c.enemyDefId === 'rift_bulwark')!;
    const husk = s.combatants.find((c) => c.enemyDefId === 'rift_husk')!;
    expect(bulwark.intents[0]).toMatchObject({ abilityId: 'bulwark_wall', column: 'front' });
    expect(husk.intents[0]!.targetIds.sort()).toEqual(['p:a', 'p:b']);
  });

  it('elite enemies are significantly stronger', () => {
    const s = encounter(
      [member('a', 0)],
      room([
        { enemy: 'rift_husk', slot: 0 },
        { enemy: 'rift_husk', slot: 1, elite: true },
      ]),
    );
    const [normal, elite] = s.combatants.filter((c) => c.side === 'enemies');
    expect(elite!.name).toBe('Elite Rift Husk');
    expect(elite!.maxHp).toBeGreaterThan(normal!.maxHp);
    expect(elite!.power).toBeGreaterThan(normal!.power);
  });
});

describe('rooms, downs and outcomes', () => {
  it('clearing a room revives downed allies with 1 HP; the last room is a victory', () => {
    let s = encounter(
      [member('a', 0, { maxHp: 999 }), member('b', 1)],
      room([{ enemy: 'rift_husk', slot: 0 }]),
    );
    s = calm(s);
    unit(s, 'p:b').hp = 0;
    unit(s, 'p:b').downed = true;
    s.combatants.find((c) => c.side === 'enemies')!.hp = 1;
    s = plan(s, 'p:a', { abilityId: 'slash' });
    s = ok(setReady(s, 'p:a'));
    expect(s.phase).toBe('room_cleared');
    expect(unit(s, 'p:b')).toMatchObject({ downed: false, hp: 1 });

    let v = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]), true);
    v = calm(v);
    v.combatants.find((c) => c.side === 'enemies')!.hp = 1;
    v = ok(setReady(plan(v, 'p:a', { abilityId: 'slash' }), 'p:a'));
    expect(v).toMatchObject({ phase: 'ended', outcome: 'victory' });
  });

  it('is deterministic for a given seed', () => {
    const run = () => {
      let s = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]), false, 7);
      for (let i = 0; i < 4 && s.phase === 'planning'; i++)
        s = ok(setReady(plan(s, 'p:a', { abilityId: 'slash' }), 'p:a'));
      return s.log;
    };
    expect(run()).toEqual(run());
  });
});

describe('group runs', () => {
  it('a leaving player is out for good and their plan is dropped; the others go on', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_warden', slot: 0 }]));
    s = plan(s, 'p:a', { abilityId: 'slash' });
    s = ok(setReady(s, 'p:b'));
    s = leaveParty(s, 'p:a');
    expect(unit(s, 'p:a')).toMatchObject({ left: true, downed: true });
    // b was the only one left and already ready: the round resolved.
    expect(s.round).toBe(2);
    expect(s.log.some((l) => l.t === 'ability' && l.actorId === 'p:a')).toBe(false);
  });

  it('the last player leaving ends the fight in defeat', () => {
    const s = leaveParty(
      encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }])),
      'p:a',
    );
    expect(s).toMatchObject({ phase: 'ended', outcome: 'defeat' });
  });
});
