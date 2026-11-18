import type { DerivedStatsDto } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  COMBAT_RULES,
  computeStats,
  createEncounter,
  enterNextRoom,
  getRift,
  timeoutTurn,
  validTargets,
  getAbility,
  leaveParty,
  type CombatState,
  type PartyMemberInput,
  type RiftRoomDef,
} from '../src/index.js';

const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;
const baseAttributes = { might: 9, agility: 6, precision: 5, vitality: 9, arcana: 5, spirit: 5 };
const baseStats = computeStats(baseAttributes).stats;

function member(
  id: string,
  slot: number,
  over: Partial<DerivedStatsDto> = {},
  abilityIds = ['slash', 'cleave', 'swap_position'],
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
const ok = (r: ReturnType<typeof applyAction>) => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('turn order and Focus', () => {
  it('party acts first, by initiative; each turn grants 3 Focus', () => {
    const s = encounter(
      [member('slow', 0, { initiative: 0 }), member('fast', 1, { initiative: 3 })],
      room([{ enemy: 'rift_husk', slot: 0 }]),
    );
    expect(s.phase).toBe('party');
    expect(s.turnOrder).toEqual(['p:fast', 'p:slow']);
    expect(s.activeId).toBe('p:fast');
    expect(unit(s, 'p:fast').focus).toBe(COMBAT_RULES.focusPerTurn);
    expect(unit(s, 'p:slow').focus).toBe(0);
  });

  it('rejects actions out of turn and without enough Focus', () => {
    const s = encounter(
      [member('a', 0, { initiative: 50 }), member('b', 1)],
      room([{ enemy: 'rift_husk', slot: 0 }]),
    );
    const notYours = applyAction(s, 'p:b', { type: 'end_turn' });
    expect(notYours).toMatchObject({ ok: false, code: 'NOT_YOUR_TURN' });
    let st = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'cleave' })); // 2 Focus → 1 left
    const poor = applyAction(st, 'p:a', { type: 'ability', abilityId: 'cleave' });
    expect(poor).toMatchObject({ ok: false, reason: 'Not enough Focus.' });
    st = ok(applyAction(st, 'p:a', { type: 'end_turn' }));
    expect(st.activeId).toBe('p:b');
  });

  it('unspent Focus carries over, capped at 6', () => {
    const tanky = room([{ enemy: 'rift_warden', slot: 0 }]);
    let s = encounter([member('a', 0, { maxHp: 999 })], tanky);
    s = ok(applyAction(s, 'p:a', { type: 'end_turn' })); // enemies act, new round
    expect(unit(s, 'p:a').focus).toBe(6);
    s = ok(applyAction(s, 'p:a', { type: 'end_turn' }));
    expect(unit(s, 'p:a').focus).toBe(COMBAT_RULES.focusMax);
  });

  it('a turn timeout ends the turn', () => {
    const s = encounter(
      [member('a', 0), member('b', 1, { initiative: -5 })],
      room([{ enemy: 'rift_husk', slot: 0 }]),
    );
    const t = timeoutTurn(s);
    expect(t.activeId).toBe('p:b');
    expect(t.log.some((l) => l.t === 'timeout')).toBe(true);
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

  it('back-column and any-position abilities', () => {
    const s = encounter([member('a', 0, {}, ['aimed_shot', 'volley'])], threeColumns);
    expect(ids(s, 'volley')).toEqual(['shard_spitter']);
    expect(ids(s, 'aimed_shot')).toHaveLength(3);
  });

  it('column abilities hit both lines of that column', () => {
    let s = encounter(
      [member('a', 0, { critChance: 0 }, ['cleave'])],
      room([
        { enemy: 'rift_husk', slot: 0 },
        { enemy: 'rift_husk', slot: 1 },
        { enemy: 'shard_spitter', slot: 2 },
      ]),
    );
    for (const c of s.combatants) if (c.side === 'enemies') c.stats.dodgeChance = 0;
    s = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'cleave' }));
    const hit = s.log
      .filter((l) => l.t === 'damage')
      .map((l) => (l as { targetId: string }).targetId);
    expect(hit).toEqual(['e:0:0', 'e:0:1']);
  });

  it('rejects targets out of reach', () => {
    const s = encounter([member('a', 0)], threeColumns);
    const spitter = s.combatants.find((c) => c.enemyDefId === 'shard_spitter')!;
    const r = applyAction(s, 'p:a', { type: 'ability', abilityId: 'slash', targetId: spitter.id });
    expect(r).toMatchObject({ ok: false, code: 'INVALID_ACTION' });
  });
});

describe('Swap Position', () => {
  it('moving to an empty slot costs only the actor', () => {
    const s = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]));
    const st = ok(
      applyAction(s, 'p:a', { type: 'ability', abilityId: 'swap_position', targetSlot: 4 }),
    );
    expect(unit(st, 'p:a')).toMatchObject({ slot: 4, focus: 2 });
  });

  it('swapping with another player costs Focus for both', () => {
    let s = encounter(
      [member('a', 0, { initiative: 5 }), member('b', 3, { initiative: 0 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    // b has 0 Focus in the first round: cannot pay.
    const poor = applyAction(s, 'p:a', {
      type: 'ability',
      abilityId: 'swap_position',
      targetSlot: 3,
    });
    expect(poor.ok).toBe(false);
    s = ok(applyAction(s, 'p:a', { type: 'end_turn' }));
    s = ok(applyAction(s, 'p:b', { type: 'end_turn' })); // b keeps 3 Focus
    s = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'swap_position', targetSlot: 3 }));
    expect(unit(s, 'p:a').slot).toBe(3);
    expect(unit(s, 'p:b').slot).toBe(0);
    expect(unit(s, 'p:b').focus).toBe(Math.min(6, 3) - 1);
  });
});

describe('rooms, downs and outcomes', () => {
  it('clearing a room revives downed allies with 1 HP and keeps HP between rooms', () => {
    let s = encounter(
      [member('a', 0, { initiative: 50, critChance: 0 }), member('b', 1)],
      room([{ enemy: 'shard_spitter', slot: 0 }]),
    );
    unit(s, 'p:b').hp = 0;
    unit(s, 'p:b').downed = true;
    unit(s, 'p:a').hp = 20;
    unit(s, 'p:a').stats.critChance = 0;
    const spitter = s.combatants.find((c) => c.side === 'enemies')!;
    spitter.stats.dodgeChance = 0;
    spitter.hp = 1;
    s = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'slash' }));
    expect(s.phase).toBe('room_cleared');
    expect(unit(s, 'p:b')).toMatchObject({ downed: false, hp: 1 });

    const rift = getRift('shattered_breach')!;
    const next = enterNextRoom(s, rift.rooms[1]!, 1, false);
    expect(unit(next, 'p:a').hp).toBe(20);
    expect(next.phase).toBe('party');
    expect(next.combatants.filter((c) => c.side === 'enemies')).toHaveLength(
      rift.rooms[1]!.enemies.length,
    );
  });

  it('clearing the last room is a victory; a wiped party is a defeat', () => {
    let s = encounter(
      [member('a', 0, { critChance: 0 })],
      room([{ enemy: 'rift_husk', slot: 0 }]),
      true,
    );
    s.combatants.find((c) => c.side === 'enemies')!.hp = 1;
    s = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'slash' }));
    expect(s).toMatchObject({ phase: 'ended', outcome: 'victory' });

    let d = encounter(
      [member('a', 0, { maxHp: 1, dodgeChance: 0 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    unit(d, 'p:a').hp = 1;
    d = ok(applyAction(d, 'p:a', { type: 'end_turn' }));
    expect(d).toMatchObject({ phase: 'ended', outcome: 'defeat' });
  });

  it('is deterministic for a given seed', () => {
    const play = (seed: number) => {
      let s = encounter(
        [member('a', 0)],
        room([
          { enemy: 'rift_husk', slot: 0 },
          { enemy: 'hollow_hound', slot: 1 },
        ]),
        false,
        seed,
      );
      for (let i = 0; i < 6 && s.phase === 'party'; i++) {
        const r = applyAction(s, 'p:a', {
          type: 'ability',
          abilityId: 'slash',
          targetId: validTargets(s, unit(s, 'p:a'), getAbility('slash')!)[0]?.id,
        });
        s = r.ok ? r.state : ok(applyAction(s, 'p:a', { type: 'end_turn' }));
      }
      return s;
    };
    expect(play(7)).toEqual(play(7));
    expect(JSON.stringify(play(7))).not.toEqual(JSON.stringify(play(8)));
  });
});

describe('Combat 2.0: block, statuses, mitigation', () => {
  const husk = room([{ enemy: 'rift_husk', slot: 0 }]);
  const enemyOf = (s: CombatState) => s.combatants.find((c) => c.side === 'enemies')!;

  it('Block absorbs damage and expires at the start of your next turn', () => {
    let s = encounter([member('a', 0, { dodgeChance: 0 }, ['raise_shield'])], husk);
    s = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'raise_shield' }));
    const gained = unit(s, 'p:a').block;
    expect(gained).toBeGreaterThan(0);
    s = ok(applyAction(s, 'p:a', { type: 'end_turn' }));
    const hits = s.log.filter((l) => l.t === 'damage' && l.targetId === 'p:a');
    expect(hits.some((h) => h.t === 'damage' && h.blocked > 0)).toBe(true);
    expect(unit(s, 'p:a').block).toBe(0); // new turn started
  });

  it('bleed ticks at the start of the target turn and counts down', () => {
    let s = encounter([member('a', 0, { critChance: 0 }, ['rend'])], husk);
    const e = enemyOf(s);
    e.stats.dodgeChance = 0;
    e.hp = 200;
    s = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'rend' }));
    expect(enemyOf(s).statuses).toEqual([expect.objectContaining({ id: 'bleed', turns: 2 })]);
    s = ok(applyAction(s, 'p:a', { type: 'end_turn' }));
    expect(s.log.some((l) => l.t === 'tick' && l.status === 'bleed')).toBe(true);
    expect(enemyOf(s).statuses[0]!.turns).toBe(1);
  });

  it('a stunned unit loses its next turn', () => {
    let s = encounter([member('a', 0), member('b', 1, { initiative: -9 })], husk);
    unit(s, 'p:b').statuses.push({ id: 'stun', turns: 1, value: 0 });
    s = ok(applyAction(s, 'p:a', { type: 'end_turn' }));
    expect(s.log.some((l) => l.t === 'stunned' && l.targetId === 'p:b')).toBe(true);
    expect(s.activeId).not.toBe('p:b');
  });

  it('marked targets take more damage; armor reduces physical damage', () => {
    const hit = (marked: boolean, armor: number) => {
      const s = encounter([member('a', 0, { critChance: 0 }, ['slash'])], husk, false, 99);
      const e = enemyOf(s);
      Object.assign(e, { hp: 500 });
      e.stats.dodgeChance = 0;
      e.stats.armor = armor;
      if (marked) e.statuses.push({ id: 'mark', turns: 2, value: 0 });
      const r = ok(applyAction(s, 'p:a', { type: 'ability', abilityId: 'slash' }));
      return r.log.find((l) => l.t === 'damage')!;
    };
    const plain = hit(false, 0) as { amount: number };
    const marked = hit(true, 0) as { amount: number };
    const armored = hit(false, 50) as { amount: number };
    expect(marked.amount).toBeGreaterThan(plain.amount);
    expect(armored.amount).toBe(Math.max(1, Math.round(plain.amount * 0.5)));
  });
});

describe('enemy intents (Slay-the-Spire style)', () => {
  it('enemies show what they will do before the party acts, then do it', () => {
    let s = encounter([member('a', 0, { maxHp: 500 })], room([{ enemy: 'rift_husk', slot: 0 }]));
    const husk = s.combatants.find((c) => c.side === 'enemies')!;
    expect(husk.intents.length).toBeGreaterThan(0);
    expect(husk.intents[0]).toEqual({ abilityId: 'husk_claw', targetIds: ['p:a'] });
    const planned = husk.intents.length;
    s = ok(applyAction(s, 'p:a', { type: 'end_turn' }));
    const used = s.log.filter((l) => l.t === 'ability' && l.actorId === husk.id);
    expect(used).toHaveLength(planned);
    // A new round: new intents are already planned.
    expect(s.combatants.find((c) => c.id === husk.id)!.intents.length).toBeGreaterThan(0);
  });

  it('stunned enemies plan nothing', () => {
    const s = encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }]));
    const t = structuredClone(s);
    const husk = t.combatants.find((c) => c.side === 'enemies')!;
    husk.statuses.push({ id: 'stun', turns: 1, value: 0 });
    const next = ok(applyAction(t, 'p:a', { type: 'end_turn' }));
    expect(next.log.some((l) => l.t === 'stunned' && l.targetId === husk.id)).toBe(true);
  });
});

describe('group runs', () => {
  it('a leaving player is out for good; the run continues for the others', () => {
    let s = encounter(
      [member('a', 0, { initiative: 50 }), member('b', 1, { initiative: 0 })],
      room([{ enemy: 'rift_warden', slot: 0 }]),
    );
    expect(s.activeId).toBe('p:a');
    s = leaveParty(s, 'p:a');
    expect(unit(s, 'p:a')).toMatchObject({ left: true, downed: true });
    expect(s.activeId).toBe('p:b');
    expect(s.phase).toBe('party');
  });

  it('the last player leaving ends the run in defeat', () => {
    const s = leaveParty(
      encounter([member('a', 0)], room([{ enemy: 'rift_husk', slot: 0 }])),
      'p:a',
    );
    expect(s).toMatchObject({ phase: 'ended', outcome: 'defeat' });
  });
});
