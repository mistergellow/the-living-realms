import { describe, expect, it } from 'vitest';
import {
  addThreat,
  createEncounter,
  THREAT_RULES,
  threatTier,
  toThreatView,
  allPaths,
  asBaseAttributes,
  attributeTest,
  availableRooms,
  childrenOf,
  combatAction,
  computeStats,
  continueRun,
  createRun,
  decisionOptions,
  EXPLORATION_RULES,
  findNode,
  generateRiftMap,
  getRift,
  leaveRun,
  parentsOf,
  Rng,
  testChance,
  timeoutRun,
  toMapDto,
  MAX_DOORS,
  validateMap,
  vote,
  type RunMember,
  type RunResult,
  type RunState,
} from '../src/index.js';

const rift = getRift('shattered_breach')!;
const pools = {
  combat: rift.encounters.combat.length,
  elite: rift.encounters.elite.length,
  events: rift.events,
};
const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;

function hero(
  id: string,
  base = { might: 12, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 },
) {
  // Equipment adds +8 Might: total 20, base stays 12 (the spec example).
  const attributes = { ...base, might: base.might + 8 };
  const { stats } = computeStats(attributes);
  const m: Omit<RunMember, 'conditions' | 'left'> = {
    characterId: id,
    name: id,
    appearance,
    baseAttributes: asBaseAttributes(base),
    attributes,
    stats,
    abilityIds: ['slash', 'cleave', 'block', 'swap_position'],
    abilityMultipliers: {},
    hp: stats.maxHp,
    mana: stats.maxMana,
    slot: 0,
  };
  return m;
}

const ok = (r: RunResult): RunState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('procedural map', () => {
  it('always respects the dungeon rules (many seeds)', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const map = generateRiftMap(rift.map, pools, seed);
      expect(validateMap(map, rift.map)).toEqual([]);
      const visible = map.nodes.filter((n) => n.type !== 'secret');
      expect(visible.length).toBeGreaterThanOrEqual(10);
      // One boss, on the last row, reached from every room of the row before.
      expect(map.nodes.filter((n) => n.type === 'boss')).toHaveLength(1);
      expect(parentsOf(map, 'boss').length).toBe(
        map.nodes.filter((n) => n.row === rift.map.rows - 1).length,
      );
      // Several entrances; branches converge somewhere.
      expect(map.nodes.filter((n) => n.row === 0).length).toBeGreaterThanOrEqual(2);
      expect(visible.some((n) => parentsOf(map, n.id).length >= 2)).toBe(true);
      // Elites never too early; first row is combat (request #90: no fixed Campsite before the boss).
      for (const n of map.nodes) {
        if (n.type === 'elite') expect(n.row).toBeGreaterThanOrEqual(rift.map.rules.minEliteRow);
        if (n.row === 0) expect(n.type).toBe('combat');
        // No two Campsites / Elites / Loot rooms in a row on a path.
        for (const c of childrenOf(map, n.id)) {
          const child = findNode(map, c)!;
          if (rift.map.rules.noConsecutive.includes(n.type) && child.type !== 'secret')
            expect(child.type).not.toBe(n.type);
        }
      }
      // Secret rooms hang from a room and lead further on.
      const secrets = map.nodes.filter((n) => n.type === 'secret');
      expect(secrets.length).toBeGreaterThanOrEqual(rift.map.secrets.min);
      for (const s of secrets) {
        expect(parentsOf(map, s.id)).toEqual([s.anchorId]);
        expect(childrenOf(map, s.id).length).toBeGreaterThan(0);
      }
    }
  });

  it('offers more than one way to the boss, and avoiding fights is possible', () => {
    const map = generateRiftMap(rift.map, pools, 3);
    const paths = allPaths(map);
    expect(paths.length).toBeGreaterThan(1);
    const combats = paths.map(
      (p) => p.filter((id) => ['combat', 'elite'].includes(findNode(map, id)!.type)).length,
    );
    expect(Math.min(...combats)).toBeLessThan(Math.max(...combats));
  });

  it('is deterministic for a seed', () => {
    expect(generateRiftMap(rift.map, pools, 9)).toEqual(generateRiftMap(rift.map, pools, 9));
  });
});

describe('BASE STATS rule', () => {
  it('exploration tests use the base attribute, never equipment', () => {
    const h = hero('a');
    expect(h.attributes.might).toBe(20);
    const test = attributeTest(h, 'might', 15, new Rng(1));
    expect(test.base).toBe(12);
    expect(test.total).toBe(12 + test.roll);
    expect(test.success).toBe(test.total >= 15);
  });

  it('odds shown to players come from the base value', () => {
    expect(testChance(12, 13)).toBeCloseTo(
      (EXPLORATION_RULES.testDie - 1 + 1) / EXPLORATION_RULES.testDie,
    );
    expect(testChance(5, 30)).toBe(0);
    expect(testChance(20, 10)).toBe(1);
  });
});

/** A run with the map and the first room forced (for tests). */
function runAt(type: string, party = [hero('a'), hero('b')]): RunState {
  const s = createRun({ rift, party, leaderId: 'a', seed: 11 });
  // Rooms like Campsites are rare (request #90): make one if the map has none.
  const target =
    s.map.nodes.find((n) => n.type === type && n.row > 0) ??
    Object.assign(
      s.map.nodes.find((n) => n.row > 0 && n.type === 'combat')!,
      { type },
    );
  // Put a row-0 room in front of it so we can vote for it.
  s.map.edges.push(['start', target.id]);
  s.map.nodes.push({ ...s.map.nodes[0]!, id: 'start', row: 0, col: 0 });
  s.currentId = 'start';
  return s;
}

describe('exploration run', () => {
  it('starts on the map with the first row available; everyone votes for the next room', () => {
    let s = createRun({ rift, party: [hero('a'), hero('b')], leaderId: 'a', seed: 5 });
    expect(s.phase).toBe('map');
    const first = availableRooms(s);
    expect(first.length).toBeGreaterThanOrEqual(2);
    s = ok(vote(s, 'a', first[0]!));
    expect(s.phase).toBe('map'); // waiting for b
    s = ok(vote(s, 'b', first[0]!));
    expect(s.phase).toBe('combat');
    expect(s.currentId).toBe(first[0]);
    expect(s.combat!.phase).toBe('planning');
  });

  it('ties are broken by the leader', () => {
    let s = createRun({ rift, party: [hero('a'), hero('b')], leaderId: 'b', seed: 5 });
    const [x, y] = availableRooms(s);
    s = ok(vote(s, 'a', x!));
    s = ok(vote(s, 'b', y!));
    expect(s.currentId).toBe(y);
  });

  it('the decision timer resolves with the votes cast so far', () => {
    let s = createRun({ rift, party: [hero('a'), hero('b')], leaderId: 'a', seed: 5 });
    const options = decisionOptions(s);
    s = ok(vote(s, 'b', options[1]!));
    s = timeoutRun(s);
    expect(s.currentId).toBe(options[1]);
  });

  it('campsites recover part (not all) of HP and Mana and remove debuffs', () => {
    let s = runAt('campsite');
    for (const m of s.party) {
      m.hp = 10;
      m.mana = 0;
      m.conditions = [
        { id: 'shaken', rooms: null },
        { id: 'inspired', rooms: 2 },
      ];
    }
    const campsite = childrenOf(s.map, 'start').find(
      (id) => findNode(s.map, id)!.type === 'campsite',
    )!;
    s = ok(vote(s, 'a', campsite));
    s = ok(vote(s, 'b', campsite));
    expect(s.phase).toBe('room');
    const m = s.party[0]!;
    expect(m.hp).toBe(
      10 + Math.round((m.stats.maxHp * EXPLORATION_RULES.campsite.hpPercent) / 100),
    );
    expect(m.hp).toBeLessThan(m.stats.maxHp);
    expect(m.mana).toBeGreaterThan(0);
    expect(m.conditions.map((c) => c.id)).toEqual(['inspired']);
  });

  it('loot rooms grant guaranteed items to everyone', () => {
    let s = runAt('loot');
    const loot = childrenOf(s.map, 'start').find((id) => findNode(s.map, id)!.type === 'loot')!;
    s = ok(vote(s, 'a', loot));
    s = ok(vote(s, 'b', loot));
    expect(s.grants.map((g) => g.characterId).sort()).toEqual(['a', 'b']);
    expect(s.outcome!.items).toHaveLength(2);
    s = ok(continueRun(s));
    expect(s.phase).toBe('map');
  });

  it('events: the group votes an approach and who attempts it; the test uses BASE stats', () => {
    let s = runAt('event', [
      hero('a', { might: 5, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 }),
      hero('b', { might: 10, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 }),
    ]);
    const ev = childrenOf(s.map, 'start').find((id) => findNode(s.map, id)!.type === 'event')!;
    findNode(s.map, ev)!.eventId = 'ancient_sealed_door';
    s = ok(vote(s, 'a', ev));
    s = ok(vote(s, 'b', ev));
    expect(s.phase).toBe('event');
    expect(decisionOptions(s)).toContain('force');
    s = ok(vote(s, 'a', 'force', 'b'));
    s = ok(vote(s, 'b', 'force', 'b'));
    const r = s.event!.result!;
    expect(r.test).toMatchObject({ testerId: 'b', attribute: 'might', base: 10 }); // not 18
    if (r.test!.success) expect(s.revealed.length).toBe(1);
    else
      expect(s.party.find((m) => m.characterId === 'b')!.hp).toBeLessThan(s.party[1]!.stats.maxHp);
  });

  it('secret rooms are not sent to players until found', () => {
    const s = createRun({ rift, party: [hero('a')], leaderId: 'a', seed: 21 });
    const secret = s.map.nodes.find((n) => n.type === 'secret')!;
    expect(toMapDto(s).nodes.some((n) => n.id === secret.id)).toBe(false);
    expect(toMapDto(s).edges.some(([a, b]) => a === secret.id || b === secret.id)).toBe(false);
    s.revealed.push(secret.id);
    expect(toMapDto(s).nodes.find((n) => n.id === secret.id)).toMatchObject({ secret: true });
  });

  it('never offers more than three doors (request #69)', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = createRun({ rift, party: [hero('a')], leaderId: 'a', seed });
      expect(availableRooms(s).length).toBeLessThanOrEqual(MAX_DOORS);
    }
  });

  it('players do not see what is behind a door until they go in (request #69)', () => {
    const s = createRun({ rift, party: [hero('a')], leaderId: 'a', seed: 21 });
    const dto = toMapDto(s);
    for (const n of dto.nodes) {
      const real = findNode(s.map, n.id)!.type;
      expect(n.type).toBe(real === 'boss' || real === 'secret' ? real : null);
    }
    const first = availableRooms(s)[0]!;
    s.visited.push(first);
    s.currentId = first;
    expect(toMapDto(s).nodes.find((n) => n.id === first)!.type).toBe(findNode(s.map, first)!.type);
  });

  it('exploration conditions carry into the next fight', () => {
    let s = runAt('combat');
    s.party[0]!.conditions = [
      { id: 'cursed', rooms: 3 },
      { id: 'warded', rooms: 2 },
    ];
    const fight = childrenOf(s.map, 'start').find((id) => findNode(s.map, id)!.type === 'combat')!;
    s = ok(vote(s, 'a', fight));
    s = ok(vote(s, 'b', fight));
    const a = s.combat!.combatants.find((c) => c.id === 'p:a')!;
    expect(a.statuses.some((x) => x.id === 'mark')).toBe(true);
    expect(a.block).toBe(6);
  });

  it('combat actions pass through; a player leaving keeps the run going for the others', () => {
    let s = createRun({ rift, party: [hero('a'), hero('b')], leaderId: 'a', seed: 5 });
    const first = availableRooms(s)[0]!;
    s = ok(vote(s, 'a', first));
    s = ok(vote(s, 'b', first));
    s = ok(combatAction(s, 'a', { type: 'plan', abilityId: 'block' }));
    // PvE: the action happens at once (Slay the Spire).
    expect(s.combat!.combatants.find((c) => c.id === 'p:a')!.block).toBeGreaterThan(0);
    s = leaveRun(s, 'a');
    expect(s.leaderId).toBe('b');
    expect(s.status).toBe('active');
    s = leaveRun(s, 'b');
    expect(s.status).toBe('defeat');
  });
});

describe('Dungeon Threat (simple, request #33)', () => {
  it('failed tests and timed-out votes raise it; clearing an Elite lowers it; the boss gets stronger', () => {
    const s = createRun({ rift, party: [hero('a')], leaderId: 'a', seed: 5 });
    expect(toThreatView(s)).toMatchObject({ value: 0, tier: null });
    const t = timeoutRun(s); // nobody voted
    expect(t.threat).toBe(THREAT_RULES.timedOutDecision);
    addThreat(t, 5);
    expect(toThreatView(t).tier?.name).toBe(threatTier(6)!.name);
    // Boss fight under Threat: stronger enemies.
    const boss = rift.encounters.boss;
    const calm = createEncounter({
      party: [],
      room: boss,
      roomIndex: 0,
      isLastRoom: true,
      seed: 1,
    });
    const tier = threatTier(6)!;
    const angry = createEncounter({
      party: [],
      room: boss,
      roomIndex: 0,
      isLastRoom: true,
      seed: 1,
      enemyModifiers: tier,
    });
    expect(angry.combatants[0]!.maxHp).toBeGreaterThan(calm.combatants[0]!.maxHp);
    expect(angry.combatants[0]!.power).toBeGreaterThan(calm.combatants[0]!.power);
  });

  it('items found on the way stay in the run (handed out only on victory)', () => {
    let s = runAt('loot');
    const loot = childrenOf(s.map, 'start').find((id) => findNode(s.map, id)!.type === 'loot')!;
    s = ok(vote(s, 'a', loot));
    s = ok(vote(s, 'b', loot));
    s = ok(continueRun(s));
    expect(s.grants).toHaveLength(2);
  });
});
