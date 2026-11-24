import type { Attributes, ItemRarity } from '@realms/shared';
import type { AbilityDef } from './abilities.js';
import SKILL_DEFS from './skills/index.js';

/*
 * Skills (request #47): powers learned from Skill Books, prepared in the 8
 * loadout slots and cast like spells. Some are free; others need BASE
 * attributes (checked when the book is read), coherent with what they do:
 * Might = brute force, Agility = speed, Precision = aimed strikes,
 * Endurance = protection, Intellect = arcane spells, Will = healing and holy.
 * PROVISIONAL numbers (A100).
 */

export type SkillDef = AbilityDef & {
  source: 'skill';
  /** BASE attributes needed to learn it; absent = anyone can learn it. */
  requirements?: Partial<Attributes>;
};

/** Every skill lives in its own folder, `skills/<id>/` (request #79). */
export const SKILLS = SKILL_DEFS satisfies Record<string, SkillDef>;

export type SkillId = keyof typeof SKILLS;

export function getSkill(id: string): SkillDef | undefined {
  return Object.hasOwn(SKILLS, id) ? (SKILLS as Record<string, SkillDef>)[id] : undefined;
}

/**
 * Skill levels (request #50): reading the book of a skill you already know
 * raises its level; each level above 1 makes its numbers stronger.
 * PROVISIONAL (A110).
 */
/*
 * Skill levels (request #50, reworked by request #53): 21 levels shown as
 * 1 … 10, M1 … M10 and P (Perfect). Reading the book of a skill you know raises
 * it by one. Every level makes the skill stronger: its numbers (damage,
 * healing, Dodge, status values — including Mark and Weaken) grow, and from M1
 * its statuses last longer. PROVISIONAL numbers (A120).
 */
export const SKILL_RULES = {
  /** Highest level: P. */
  maxLevel: 21,
  /** Power gained per level from 2 to 10, per level from M1 to M10, and at P. */
  perLevel: 0.1,
  perMasterLevel: 0.08,
  perfectBonus: 0.3,
  /** Extra status turns (not Stun) at M1 and again at P. */
  extraTurnsAt: [11, 21] as readonly number[],
  /**
   * Request #66: reading to reach a level can fail. Success chance (percent)
   * to reach level 2, then −4 per level, never below 20 (PROVISIONAL, A128).
   */
  readChanceAtLevel2: 96,
  readChanceStep: 4,
  readChanceMin: 20,
} as const;

/**
 * Request #66: books needed to reach a level — level 1 (learning) 1 book,
 * level 2 2 books … 10 → 10, M1 → 11 … M10 → 20, P → 21. They are all used
 * up by the attempt, whether it succeeds or not.
 */
export const booksToReach = (level: number) =>
  Math.max(1, Math.min(SKILL_RULES.maxLevel, Math.round(level)));

/** Chance (percent) that reading the books raises the skill to `level`. */
export function readChance(level: number): number {
  if (level <= 1) return 100;
  return Math.max(
    SKILL_RULES.readChanceMin,
    SKILL_RULES.readChanceAtLevel2 - SKILL_RULES.readChanceStep * (level - 2),
  );
}

/** "1" … "10", "M1" … "M10", "P". */
export function skillLevelLabel(level: number): string {
  const l = Math.max(1, Math.min(SKILL_RULES.maxLevel, Math.round(level)));
  if (l <= 10) return String(l);
  if (l < SKILL_RULES.maxLevel) return `M${l - 10}`;
  return 'P';
}

/** Multiplier for a skill's damage, healing, Dodge and status values at a level. */
export function skillLevelMultiplier(level: number): number {
  const l = Math.max(1, Math.min(SKILL_RULES.maxLevel, Math.round(level)));
  const normal = Math.min(l, 10) - 1;
  const master = Math.max(0, Math.min(l, 20) - 10);
  const perfect = l === SKILL_RULES.maxLevel ? SKILL_RULES.perfectBonus : 0;
  return (
    1 +
    Math.round(
      (normal * SKILL_RULES.perLevel + master * SKILL_RULES.perMasterLevel + perfect) * 100,
    ) /
      100
  );
}

/** Extra turns a skill's statuses last at a level (Stun never lasts longer). */
export const skillExtraTurns = (level: number) =>
  SKILL_RULES.extraTurnsAt.filter((at) => level >= at).length;

/**
 * A skill as it is at a level: the numbers the player sees (and the engine
 * uses through the level multiplier and `skillExtraTurns`).
 */
export function skillAtLevel<A extends AbilityDef>(a: A, level: number): A {
  if (level <= 1) return a;
  const m = skillLevelMultiplier(level);
  const extra = skillExtraTurns(level);
  /**
   * Whole numbers, always rounded down (request #59), like in combat. For
   * display only: combat applies the multiplier itself.
   */
  const r1 = (n: number) => Math.max(1, Math.floor(n * m));
  return {
    ...a,
    effects: a.effects.map((e) => {
      if (e.kind === 'damage' || e.kind === 'heal' || e.kind === 'block')
        return { ...e, min: r1(e.min), max: r1(e.max) };
      if (e.kind === 'status')
        return {
          ...e,
          ...(e.value ? { value: r1(e.value) } : {}),
          turns: e.status === 'stun' ? e.turns : e.turns + extra,
        };
      return e;
    }),
  };
}

/** Item id of the Skill Book that teaches a skill. */
export const skillBookId = (skillId: string) => `book_${skillId}`;

/**
 * Request #80: a skill's icon background follows its level, in the rarity
 * colours. PROVISIONAL bands (A142): 1–3 Common, 4–6 Uncommon, 7–10 Rare,
 * M1–M5 Epic, M6–M10 Legendary, P Mythic.
 */
export const SKILL_LEVEL_RARITY: ReadonlyArray<{ from: number; rarity: ItemRarity }> = [
  { from: 21, rarity: 'mythic' },
  { from: 16, rarity: 'legendary' },
  { from: 11, rarity: 'epic' },
  { from: 7, rarity: 'rare' },
  { from: 4, rarity: 'uncommon' },
  { from: 1, rarity: 'common' },
];
export const skillLevelRarity = (level: number): ItemRarity =>
  SKILL_LEVEL_RARITY.find((b) => level >= b.from)?.rarity ?? 'common';
