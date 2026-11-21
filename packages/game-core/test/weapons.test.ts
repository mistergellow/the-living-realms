import { describe, expect, it } from 'vitest';
import {
  abilityMultipliers,
  getAbility,
  getWeaponType,
  ITEMS,
  normalizeWeaponInstance,
  upgradeMultiplier,
  WEAPON_RULES,
  WEAPON_TYPES,
  weaponDamage,
  weaponInfo,
  weaponScaling,
  type CatalogueWeaponType,
} from '../src/index.js';

describe('weapon catalogue', () => {
  const types = Object.keys(WEAPON_TYPES) as CatalogueWeaponType[];

  it('has the initial weapons with their attributes and handedness', () => {
    for (const t of ['sword', 'axe', 'dagger', 'spear', 'mace', 'bow', 'staff', 'wand'])
      expect(types).toContain(t);
    expect(WEAPON_TYPES.sword).toMatchObject({ hands: 1, primary: 'might', secondary: 'agility' });
    expect(WEAPON_TYPES.axe).toMatchObject({ hands: 1, primary: 'might', secondary: 'endurance' });
    expect(WEAPON_TYPES.dagger).toMatchObject({
      hands: 1,
      primary: 'agility',
      secondary: 'precision',
    });
    expect(WEAPON_TYPES.spear).toMatchObject({
      hands: 2,
      primary: 'might',
      secondary: 'precision',
    });
    expect(WEAPON_TYPES.mace).toMatchObject({ hands: 1, primary: 'might', secondary: 'endurance' });
    expect(WEAPON_TYPES.bow).toMatchObject({ hands: 2, primary: 'precision', category: 'ranged' });
    expect(WEAPON_TYPES.staff).toMatchObject({ hands: 2, primary: 'intellect', secondary: 'will' });
    expect(WEAPON_TYPES.wand).toMatchObject({
      hands: 1,
      primary: 'intellect',
      secondary: 'precision',
    });
  });

  it('every weapon type defines its basic attack, using its base damage and scaling', () => {
    for (const t of types) {
      const w = WEAPON_TYPES[t];
      const a = getAbility(w.basicAttack)!;
      expect(a).toBeDefined();
      expect(a.focusCost).toBe(w.basicAttackCost);
      expect(a.effects[0]).toMatchObject({
        kind: 'damage',
        damageType: w.attackType,
        ...w.baseDamage,
      });
      expect(a.scaling).toEqual(weaponScaling(t));
    }
  });

  it('items of the same type share the same basic attack and hands', () => {
    for (const item of Object.values(ITEMS)) {
      const w =
        'weaponType' in item ? WEAPON_TYPES[item.weaponType as CatalogueWeaponType] : undefined;
      if (!w || item.kind !== 'weapon') continue;
      expect(item.abilities?.[0]).toBe(w.basicAttack);
      expect(!!('twoHanded' in item && item.twoHanded)).toBe(w.hands === 2);
    }
  });

  it('heavy weapons cost 3 Focus per basic attack, daggers 1', () => {
    expect(WEAPON_TYPES.axe.basicAttackCost).toBe(3);
    expect(WEAPON_TYPES.mace.basicAttackCost).toBe(3);
    expect(WEAPON_TYPES.dagger.basicAttackCost).toBe(1);
  });

  it('upgrades improve numbers predictably (no random rolls)', () => {
    expect(upgradeMultiplier(0)).toBe(1);
    expect(upgradeMultiplier(2)).toBeCloseTo(1 + 2 * WEAPON_RULES.upgradePerLevel);
    expect(weaponDamage('sword', 1)).toEqual(weaponDamage('sword', 1));
    expect(weaponDamage('sword', 3).max).toBeGreaterThan(weaponDamage('sword', 0).max);
    const m = abilityMultipliers([
      { id: 'w', defId: 'training_sword', quality: 100, equippedSlot: 'mainHand', upgradeLevel: 2 },
    ]);
    expect(m.slash).toBeCloseTo(1.2);
    expect(m.block).toBeUndefined();
  });

  it('up to 5 specials and 2 rune slots, locked by default', () => {
    const n = normalizeWeaponInstance({
      specials: Array.from({ length: 9 }, (_, i) => ({ id: `s${i}` })),
    });
    expect(n.specials).toHaveLength(WEAPON_RULES.maxSpecials);
    expect(n.runeSlots).toEqual([
      { unlocked: false, runeId: null },
      { unlocked: false, runeId: null },
    ]);
    expect(weaponInfo('sword', {})).toMatchObject({ basicAttackId: 'slash', upgradeLevel: 0 });
    expect(weaponInfo('shield', {})).toBeNull();
  });
});

describe('more weapon types (request #45)', () => {
  it('each new type has an item, a basic attack and a signature ability', () => {
    const types = [
      'greatsword',
      'greataxe',
      'handaxe',
      'hammer',
      'greathammer',
      'morningstar',
      'lance',
      'crossbow',
    ] as const;
    for (const type of types) {
      const w = getWeaponType(type)!;
      const def = Object.values(ITEMS).find((i) => i.weaponType === type)!;
      expect(def, type).toBeDefined();
      expect(!!def.twoHanded).toBe(w.hands === 2);
      expect(def.abilities![0]).toBe(w.basicAttack);
      expect(def.abilities!.length).toBeGreaterThanOrEqual(2);
      for (const id of def.abilities!) expect(getAbility(id), id).toBeDefined();
    }
  });

  it('crossbow bolts pierce Dodge: double damage against a target with Dodge', () => {
    const bolt = getAbility('piercing_bolt')!;
    const dmg = bolt.effects.find((e) => e.kind === 'damage');
    expect(dmg && dmg.kind === 'damage' && dmg.bonusVsBlock).toBe(2);
  });
});
