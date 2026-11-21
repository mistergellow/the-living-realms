import type { DerivedStatsDto, PlanActionInput } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  absorbWithBlock,
  BASIC_ACTIONS,
  COMBAT_RULES,
  computeStats,
  createEncounter,
  createPvpEncounter,
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
  abilityIds = ['slash', 'stab', 'cleave', 'block', 'swap_position'],
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
    c.stats = { ...c.stats, critChance: 0 };
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

describe('PvE turn (Slay the Spire, request #34)', () => {
  it('actions happen at once; ending the turn lets the enemies act; a new round begins', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_husk', slot: 0 }]));
    expect(s.phase).toBe('planning');
    expect(s.initiative).toBeNull(); // no initiative roll in PvE: the party always starts
    s = plan(s, 'p:a', { abilityId: 'stab' });
    expect(s.plan).toEqual([]);
    expect(s.log.some((l) => l.t === 'ability' && l.actorId === 'p:a')).toBe(true);
    expect(unit(s, 'p:a').focus).toBe(3 - 1);
    s = ok(setReady(s, 'p:a'));
    expect(s.round).toBe(1); // waits for b
    s = ok(setReady(s, 'p:b'));
    expect(s.round).toBe(2);
    expect(s.log.some((l) => l.t === 'resolve' && l.first === 'enemies')).toBe(true);
    expect(s.log.some((l) => l.t === 'ability' && l.actorId.startsWith('e:'))).toBe(true);
  });

  it('cannot act beyond the Focus (and Mana) available; nothing to undo', () => {
    let s = encounter(
      [member('a', 0, { focusPerRound: 3 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    s = plan(s, 'p:a', { abilityId: 'cleave' }); // 2
    expect(planAction(s, 'p:a', { type: 'plan', abilityId: 'cleave' })).toMatchObject({
      ok: false,
      reason: 'Not enough Focus.',
    });
    s = plan(s, 'p:a', { abilityId: 'stab' });
    expect(unit(s, 'p:a').focus).toBe(0);
    expect(unplanAction(s, 'p:a', 1).ok).toBe(false);
  });

  it('after ending the turn you cannot act; the timer ends everyone’s turn', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_warden', slot: 0 }]));
    s = ok(setReady(s, 'p:a'));
    expect(planAction(s, 'p:a', { type: 'plan', abilityId: 'block' }).ok).toBe(false);
    const t = timeoutTurn(s);
    expect(t.round).toBe(2);
    expect(t.log.some((l) => l.t === 'timeout')).toBe(true);
  });

  it('enemies act in order of initiative, each with its intents', () => {
    let s = encounter(
      [member('a', 0, { maxHp: 999 })],
      room([
        { enemy: 'rift_bulwark', slot: 0 },
        { enemy: 'hollow_hound', slot: 2 },
      ]),
    );
    s = calm(s);
    const [bulwark, hound] = s.combatants.filter((c) => c.side === 'enemies');
    bulwark!.intents = [{ abilityId: 'bulwark_bash', targetIds: [], column: 'front' }];
    hound!.intents = [{ abilityId: 'hound_lunge', targetIds: [], column: 'front' }];
    hound!.focus = 5;
    const seq = s.logSeq;
    s = ok(setReady(s, 'p:a'));
    // The hound has more initiative (9 vs 1).
    expect(actors(s, seq)).toEqual([hound!.id, bulwark!.id]);
  });
});

describe('Block', () => {
  it('absorbs damage before HP (spec examples)', () => {
    expect(absorbWithBlock(10, 5)).toEqual({ toHp: 5, blocked: 5, blockLeft: 0 });
    expect(absorbWithBlock(5, 10)).toEqual({ toHp: 0, blocked: 5, blockLeft: 5 });
  });

  it('costs 1 Focus, stacks, protects against the enemy phase, then resets', () => {
    let s = encounter(
      [member('a', 0, { maxHp: 999, armor: 0, physicalReduction: 0 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    s = calm(s);
    expect(getAbility('block')!.focusCost).toBe(BASIC_ACTIONS.block.focusCost);
    s = plan(s, 'p:a', { abilityId: 'block' });
    s = plan(s, 'p:a', { abilityId: 'block' });
    expect(unit(s, 'p:a').block).toBe(2 * BASIC_ACTIONS.block.amount);
    const warden = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    warden.intents = [{ abilityId: 'warden_slam', targetIds: [], column: 'front' }];
    s = ok(setReady(s, 'p:a'));
    const hit = s.log.find((l) => l.t === 'damage' && l.targetId === 'p:a') as { blocked: number };
    expect(hit.blocked).toBeGreaterThan(0);
    expect(unit(s, 'p:a').block).toBe(0); // new round
  });

  it("enemy Block lasts through the party's turn", () => {
    let s = encounter([member('a', 0)], room([{ enemy: 'rift_bulwark', slot: 0 }]));
    s = calm(s);
    const bulwark = s.combatants.find((c) => c.side === 'enemies')!;
    bulwark.intents = [{ abilityId: 'bulwark_wall', targetIds: [], column: 'front' }];
    s = ok(setReady(s, 'p:a'));
    expect(s.round).toBe(2);
    expect(unit(s, bulwark.id).block).toBeGreaterThan(0);
  });
});

describe('targeting in one line of 4 positions (request #35)', () => {
  const line = room([
    { enemy: 'rift_husk', slot: 0 },
    { enemy: 'hollow_hound', slot: 1 },
    { enemy: 'shard_spitter', slot: 2 },
  ]);
  const ids = (s: CombatState, ability: string) =>
    validTargets(s, unit(s, 'p:a'), getAbility(ability)!).map((c) => c.enemyDefId);

  it('melee hits the nearest occupied position', () => {
    const s = encounter([member('a', 0)], line);
    expect(ids(s, 'slash')).toEqual(['rift_husk']);
    const t = structuredClone(s);
    t.combatants.find((c) => c.enemyDefId === 'rift_husk')!.downed = true;
    expect(ids(t, 'slash')).toEqual(['hollow_hound']);
  });

  it('the spear and Cleave reach the two nearest; ranged reaches anyone; Volley hits all', () => {
    const s = encounter([member('a', 0, {}, ['thrust', 'cleave', 'aimed_shot', 'volley'])], line);
    expect(ids(s, 'thrust')).toEqual(['rift_husk', 'hollow_hound']);
    expect(ids(s, 'cleave')).toEqual(['rift_husk', 'hollow_hound']);
    expect(ids(s, 'aimed_shot')).toHaveLength(3);
    expect(ids(s, 'volley')).toHaveLength(3);
  });

  it('a single-target attack hits one position; Cleave hits both in reach; out of reach is rejected', () => {
    let s = calm(
      encounter([member('a', 0, { focusPerRound: 6 }, ['aimed_shot', 'cleave', 'stab'])], line),
    );
    expect(
      planAction(s, 'p:a', { type: 'plan', abilityId: 'stab', targetColumn: 'third' }).ok,
    ).toBe(false);
    let seq = s.logSeq;
    s = plan(s, 'p:a', { abilityId: 'aimed_shot', targetColumn: 'third' });
    const hits = (from: number) =>
      s.log
        .filter((l) => l.seq > from && l.t === 'damage')
        .map((l) => (l as { targetId: string }).targetId);
    expect(hits(seq)).toEqual(['e:0:2']);
    seq = s.logSeq;
    s = plan(s, 'p:a', { abilityId: 'cleave' });
    expect(hits(seq)).toEqual(['e:0:0', 'e:0:1']);
  });
});

describe('change position', () => {
  it('moving to an empty slot costs 1 Focus for the actor only', () => {
    let s = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]));
    expect(getAbility('swap_position')!.focusCost).toBe(BASIC_ACTIONS.changePosition.focusCost);
    s = plan(s, 'p:a', { abilityId: 'swap_position', targetSlot: 3 });
    expect(unit(s, 'p:a')).toMatchObject({ slot: 3, focus: 2 });
  });

  it('swapping with another player costs Focus for both', () => {
    let s = encounter(
      [member('a', 0, { focusPerRound: 3 }), member('b', 3, { focusPerRound: 3 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    s = plan(s, 'p:b', { abilityId: 'cleave' });
    s = plan(s, 'p:b', { abilityId: 'stab' }); // b has 0 left
    expect(
      planAction(s, 'p:a', { type: 'plan', abilityId: 'swap_position', targetSlot: 3 }).ok,
    ).toBe(false);
    let t = encounter(
      [member('a', 0, { focusPerRound: 3 }), member('b', 3, { focusPerRound: 3 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    t = plan(t, 'p:a', { abilityId: 'swap_position', targetSlot: 3 });
    expect(unit(t, 'p:a')).toMatchObject({ slot: 3, focus: 2 });
    expect(unit(t, 'p:b')).toMatchObject({ slot: 0, focus: 2 });
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
    expect(planAction(s, 'p:b', { type: 'plan', abilityId: 'stab' })).toMatchObject({
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

  it('a Bulwark shields the two enemies at the front; attackers hit the nearest position', () => {
    const s = encounter(
      [member('a', 0), member('b', 1)],
      room([
        { enemy: 'rift_bulwark', slot: 0 },
        { enemy: 'rift_husk', slot: 1 },
      ]),
    );
    const bulwark = s.combatants.find((c) => c.enemyDefId === 'rift_bulwark')!;
    const husk = s.combatants.find((c) => c.enemyDefId === 'rift_husk')!;
    expect(bulwark.intents[0]).toMatchObject({ abilityId: 'bulwark_wall' });
    expect(husk.intents[0]!.targetIds).toEqual(['p:a']);
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
    s = plan(s, 'p:a', { abilityId: 'stab' });
    expect(s.phase).toBe('room_cleared');
    expect(unit(s, 'p:b')).toMatchObject({ downed: false, hp: 1 });

    let v = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]), true);
    v = calm(v);
    v.combatants.find((c) => c.side === 'enemies')!.hp = 1;
    v = plan(v, 'p:a', { abilityId: 'stab' });
    expect(v).toMatchObject({ phase: 'ended', outcome: 'victory' });
  });

  it('is deterministic for a given seed', () => {
    const run = () => {
      let s = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]), false, 7);
      for (let i = 0; i < 4 && s.phase === 'planning'; i++) {
        s = plan(s, 'p:a', { abilityId: 'stab' });
        if (s.phase === 'planning') s = ok(setReady(s, 'p:a'));
      }
      return s.log;
    };
    expect(run()).toEqual(run());
  });
});

describe('group runs', () => {
  it('a leaving player is out for good; if the others already ended the turn, the enemies act', () => {
    let s = encounter([member('a', 0), member('b', 1)], room([{ enemy: 'rift_warden', slot: 0 }]));
    s = ok(setReady(s, 'p:b'));
    s = leaveParty(s, 'p:a');
    expect(unit(s, 'p:a')).toMatchObject({ left: true, downed: true });
    expect(s.round).toBe(2);
  });

  it('the last player leaving ends the fight in defeat', () => {
    const s = leaveParty(
      encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }])),
      'p:a',
    );
    expect(s).toMatchObject({ phase: 'ended', outcome: 'defeat' });
  });
});

describe('PvP (test mode): planning and alternating resolution', () => {
  const duel = (a = {}, b = {}) =>
    calm(
      createPvpEncounter({
        teamA: [member('a', 0, { maxHp: 999, ...a })],
        teamB: [member('b', 0, { maxHp: 999, ...b })],
        seed: 4,
      }),
    );

  it('plans are queued, reserved, removable until ready; nothing resolves before both teams are ready', () => {
    let s = duel({ focusPerRound: 3 });
    s = plan(s, 'p:a', { abilityId: 'cleave' });
    expect(reservedBy(s, 'p:a').focus).toBe(2);
    expect(planAction(s, 'p:a', { type: 'plan', abilityId: 'cleave' }).ok).toBe(false);
    s = ok(unplanAction(s, 'p:a', s.plan[0]!.id));
    s = plan(s, 'p:a', { abilityId: 'stab' });
    expect(s.log.some((l) => l.t === 'ability')).toBe(false);
    s = ok(setReady(s, 'p:a'));
    expect(planAction(s, 'p:a', { type: 'plan', abilityId: 'block' }).ok).toBe(false);
    s = ok(setReady(s, 'p:b'));
    expect(s.round).toBe(2);
  });

  it('team initiative decides who starts; actions alternate in planned order', () => {
    let s = duel({ initiative: 100 }, { initiative: -100 });
    expect(s.initiative!.first).toBe('party');
    s = plan(s, 'p:a', { abilityId: 'stab' });
    s = plan(s, 'p:a', { abilityId: 'stab' });
    s = plan(s, 'p:b', { abilityId: 'stab' });
    const seq = s.logSeq;
    s = ok(setReady(ok(setReady(s, 'p:a')), 'p:b'));
    expect(actors(s, seq)).toEqual(['p:a', 'p:b', 'p:a']);
  });

  it('a character defeated before their action does not act', () => {
    let s = calm(
      createPvpEncounter({
        teamA: [
          member('a', 0, { initiative: -100 }),
          member('c', 4, { initiative: -100, maxHp: 999 }),
        ],
        teamB: [member('b', 0, { initiative: 100, maxHp: 999 })],
        seed: 4,
      }),
    );
    unit(s, 'p:a').hp = 1;
    unit(s, 'p:a').stats.armor = 0;
    s = plan(s, 'p:b', { abilityId: 'cleave' });
    s = plan(s, 'p:a', { abilityId: 'stab' });
    s = ok(setReady(ok(setReady(ok(setReady(s, 'p:a')), 'p:c')), 'p:b'));
    expect(unit(s, 'p:a').downed).toBe(true);
    expect(s.log.some((l) => l.t === 'skipped' && l.actorId === 'p:a')).toBe(true);
  });
});

describe('PvP (test mode)', () => {
  it('two teams of players plan at the same time and alternate; last team standing wins', () => {
    let s = createPvpEncounter({
      teamA: [member('a', 0, { maxHp: 30, initiative: 100 })],
      teamB: [member('b', 0, { maxHp: 30 })],
      seed: 3,
    });
    expect(s.mode).toBe('pvp');
    expect(unit(s, 'p:b').side).toBe('enemies');
    expect(unit(s, 'p:b').intents).toEqual([]);
    s = calm(s);
    s = plan(s, 'p:a', { abilityId: 'stab' });
    s = plan(s, 'p:b', { abilityId: 'stab' });
    const seq = s.logSeq;
    s = ok(setReady(s, 'p:a'));
    expect(s.round).toBe(1); // waits for team B
    s = ok(setReady(s, 'p:b'));
    expect(actors(s, seq)).toEqual(['p:a', 'p:b']);
    for (let i = 0; i < 30 && s.phase === 'planning'; i++) {
      s = calm(s);
      unit(s, 'p:b').stats.armor = 0;
      s = ok(setReady(plan(s, 'p:a', { abilityId: 'stab' }), 'p:a'));
      if (s.phase === 'planning') s = ok(setReady(s, 'p:b'));
    }
    expect(s).toMatchObject({ phase: 'ended', outcome: 'victory' });
    expect(unit(s, 'p:b').downed).toBe(true);
    expect(s.log.some((l) => l.t === 'revived')).toBe(false);
  });
});
