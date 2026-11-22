import { describe, expect, it } from 'vitest';
import {
  AP_RULES,
  apFullAt,
  checkMove,
  createWorldBossRun,
  currentAp,
  getRift,
  getStarterKit,
  nextBossHex,
  professionTerrains,
  REGIONS,
  RIFT_TIERS,
  RIFTLANDS_CENTER,
  riftSites,
  RIFT_LAYOUT_RULES,
  isRiftOpen,
  nextRiftReset,
  riftDay,
  parseRiftId,
  riftTierModifiers,
  STARTER_KITS,
  worldBossDamage,
  worldMapHexes,
  mapHexAt,
  computeStats,
  BASE_ATTRIBUTES,
  asBaseAttributes,
} from '../src/index.js';

describe('terrain and Rift entrances (request #43)', () => {
  it('every nation has forests, rivers and mountains to gather in', () => {
    for (const id of ['west', 'east', 'north'] as const)
      for (const terrain of ['forest', 'river', 'mountain', 'plains'] as const)
        expect(worldMapHexes().some((h) => h.region === id && h.terrain === terrain)).toBe(true);
  });

  it('gathering professions need their terrain; crafting works anywhere', () => {
    expect(professionTerrains('fishing')).toEqual(['river']);
    expect(professionTerrains('mining')).toEqual(['mountain']);
    expect(professionTerrains('woodcutting')).toEqual(['forest']);
    expect(professionTerrains('blacksmith')).toBeNull();
  });

  it('Rifts form a pyramid of threat; high tiers sit deep in the Riftlands (request #55)', () => {
    const sites = riftSites();
    const count = (t: number) => sites.filter((s) => s.rift!.tier === t).length;
    expect(sites).toHaveLength(RIFT_LAYOUT_RULES.perTier.reduce((a, b) => a + b, 0));
    for (let t = 1; t < RIFT_TIERS; t++) expect(count(t)).toBeGreaterThan(count(t + 1));
    for (const s of sites.filter((x) => x.rift!.tier >= 3)) expect(s.region).toBe('riftlands');
    for (const s of sites.filter((x) => x.rift!.tier === RIFT_TIERS))
      expect(s.riftDepth!).toBeGreaterThanOrEqual(RIFT_LAYOUT_RULES.minDepth[RIFT_TIERS - 1]!);
    expect(sites.every((s) => s.terrain !== 'city' && s.terrain !== 'river')).toBe(true);
  });

  it('some low Rifts open inside the nations (over a few days)', () => {
    const days = [0, 1, 2, 3, 4].map((d) => new Date(Date.UTC(2026, 10, 1 + d)));
    const inNations = days.flatMap((d) => riftSites(d).filter((s) => s.region !== 'riftlands'));
    expect(inNations.length).toBeGreaterThan(0);
    for (const s of inNations) expect(s.rift!.tier).toBeLessThanOrEqual(2);
  });

  it('Rifts move every day; yesterday\'s Rift still resolves but is closed', () => {
    const today = new Date(Date.UTC(2026, 10, 22, 12));
    const tomorrow = new Date(Date.UTC(2026, 10, 23, 12));
    const a = riftSites(today).map((s) => s.rift!.id);
    const b = riftSites(tomorrow).map((s) => s.rift!.id);
    expect(a).not.toEqual(b);
    expect(isRiftOpen(a[0]!, today)).toBe(true);
    expect(isRiftOpen(a[0]!, tomorrow)).toBe(false);
    expect(getRift(a[0]!)).toBeDefined(); // runs in progress keep working
    expect(nextRiftReset(today).toISOString()).toBe('2026-11-23T00:00:00.000Z');
    expect(riftDay(today)).toBe(riftDay(new Date(Date.UTC(2026, 10, 22, 23, 59))));
    // Ids from before the daily layout still resolve.
    const deep = mapHexAt(RIFTLANDS_CENTER)!;
    const legacy = `rift_${deep.q}_${deep.r}`.replace(/-/g, 'm');
    expect(parseRiftId(legacy)).toMatchObject({ q: deep.q, r: deep.r, tier: RIFT_TIERS });
  });

  it('a site Rift is the template scaled by its tier', () => {
    const t1 = riftSites().find((s) => s.rift!.tier === 1)!;
    const t5 = riftSites().find((s) => s.rift!.tier === RIFT_TIERS)!;
    const easy = getRift(t1.rift!.id)!;
    const hard = getRift(t5.rift!.id)!;
    expect(easy.site).toEqual({ q: t1.q, r: t1.r });
    expect(easy.startingThreat).toBe(0);
    expect(hard.startingThreat).toBeGreaterThan(0);
    expect(hard.rewards.reputation).toBeGreaterThan(easy.rewards.reputation);
    expect(riftTierModifiers(1)).toEqual({ hpMultiplier: 1, powerMultiplier: 1 });
    expect(riftTierModifiers(5).hpMultiplier).toBeGreaterThan(1);
  });
});

describe('Action Points (request #43)', () => {
  it('refill 10 per real hour, up to 120', () => {
    const t0 = new Date('2026-01-01T00:00:00Z');
    expect(AP_RULES).toMatchObject({ max: 120, perHour: 10 });
    expect(currentAp(0, t0, new Date('2026-01-01T03:00:00Z'))).toBe(30);
    expect(currentAp(100, t0, new Date('2026-01-02T00:00:00Z'))).toBe(120);
    expect(apFullAt(120)).toBeNull();
    expect(apFullAt(110, t0)!.toISOString()).toBe('2026-01-01T01:00:00.000Z');
  });

  it('travel costs AP per hex; never into the sea', () => {
    const from = REGIONS.west.capital!.hex;
    const to = { q: from.q + 2, r: from.r };
    expect(checkMove(from, to, 120)).toEqual({
      ok: true,
      steps: 2,
      cost: 2 * AP_RULES.moveCostPerHex,
    });
    expect(checkMove(from, to, 1).ok).toBe(false);
    expect(checkMove(from, { q: 300, r: 0 }, 120).ok).toBe(false);
    expect(checkMove(from, from, 120).ok).toBe(false);
  });
});

describe('starter kits (request #43)', () => {
  it('sword, bow, dagger, or a wand with Fireball', () => {
    expect(STARTER_KITS.map((k) => k.id)).toEqual(['sword', 'bow', 'dagger', 'fireball']);
    expect(getStarterKit('fireball')).toMatchObject({ weapon: 'birch_wand', skills: ['fireball'] });
  });
});

describe('world boss (request #43)', () => {
  it('a fight against the shared pool counts the damage dealt', () => {
    const { stats } = computeStats(BASE_ATTRIBUTES);
    const run = createWorldBossRun({
      season: 1,
      bossHp: 4_321_000,
      party: [
        {
          characterId: 'a',
          name: 'A',
          appearance: { version: 1, color: '#c0392b', emblem: 'circle' },
          baseAttributes: asBaseAttributes(BASE_ATTRIBUTES),
          attributes: BASE_ATTRIBUTES,
          stats,
          abilityIds: ['slash'],
          abilityMultipliers: {},
          hp: stats.maxHp,
          mana: stats.maxMana,
          slot: 0,
        },
      ],
      leaderId: 'a',
      seed: 3,
    });
    const boss = run.combat!.combatants.find((c) => c.side === 'enemies')!;
    expect(boss.hp).toBe(4_321_000);
    expect(worldBossDamage(run)).toBe(0);
    boss.hp -= 1234;
    expect(worldBossDamage(run)).toBe(1234);
  });

  it('roams only through the Riftlands', () => {
    let h = RIFTLANDS_CENTER;
    for (let i = 0; i < 50; i++) {
      h = nextBossHex(h, (i * 0.37) % 1);
      expect(mapHexAt(h)!.region).toBe('riftlands');
    }
  });
});
