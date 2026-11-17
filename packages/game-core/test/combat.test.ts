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
  type CombatState,
  type PartyMemberInput,
  type RiftRoomDef,
} from '../src/index.js';

const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;
const baseStats = computeStats({ str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }).stats;

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
      [member('a', 0, { initiative: 5 }), member('b', 1)],
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

describe('targeting by rows', () => {
  const twoRows = room([
    { enemy: 'rift_husk', slot: 1 },
    { enemy: 'shard_spitter', slot: 4 },
  ]);

  it('"front" abilities hit the first occupied row', () => {
    const s = encounter([member('a', 0)], twoRows);
    const actor = unit(s, 'p:a');
    expect(validTargets(s, actor, getAbility('slash')!).map((c) => c.enemyDefId)).toEqual([
      'rift_husk',
    ]);
    // Once the front row is empty, the back row is exposed.
    const noFront = structuredClone(s);
    noFront.combatants.find((c) => c.enemyDefId === 'rift_husk')!.downed = true;
    expect(
      validTargets(noFront, unit(noFront, 'p:a'), getAbility('slash')!).map((c) => c.enemyDefId),
    ).toEqual(['shard_spitter']);
  });

  it('back-row and any-row abilities', () => {
    const s = encounter([member('a', 0, {}, ['aimed_shot', 'volley'])], twoRows);
    const actor = unit(s, 'p:a');
    expect(validTargets(s, actor, getAbility('volley')!).map((c) => c.enemyDefId)).toEqual([
      'shard_spitter',
    ]);
    expect(validTargets(s, actor, getAbility('aimed_shot')!)).toHaveLength(2);
  });

  it('rejects targets outside the allowed rows', () => {
    const s = encounter([member('a', 0)], twoRows);
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
      [member('a', 0, { initiative: 5, physicalPower: 50 }), member('b', 1)],
      room([{ enemy: 'shard_spitter', slot: 0 }]),
    );
    unit(s, 'p:b').hp = 0;
    unit(s, 'p:b').downed = true;
    unit(s, 'p:a').hp = 20;
    unit(s, 'p:a').stats.critChance = 0;
    s.combatants.find((c) => c.side === 'enemies')!.stats.dodgeChance = 0;
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
      [member('a', 0, { physicalPower: 99, critChance: 0 })],
      room([{ enemy: 'rift_husk', slot: 0 }]),
      true,
    );
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
