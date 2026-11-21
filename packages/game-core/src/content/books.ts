import type { AttributeKey, EquipSlot, ItemKind } from '@realms/shared';
import { ABILITIES, type AbilityId } from './abilities.js';

/*
 * Skill books (request #36). Reading a book is using an item: it costs AP
 * (time for now), may fail, and the book is consumed either way. Each book
 * teaches one skill or raises its rank (see `skills.ts`).
 *
 * Some books need a minimum BASE attribute to be read (base = creation only,
 * never equipment), so a tank cannot simply pick up Fireball. Requirements
 * are moderate on purpose: hybrid builds are possible, just not free.
 * PROVISIONAL CONTENT.
 */

export type SkillSchool = 'arcane' | 'divine' | 'hybrid' | 'martial';

export const SKILL_SCHOOL_NAMES: Record<SkillSchool, string> = {
  arcane: 'Arcane',
  divine: 'Divine',
  hybrid: 'Half-caster',
  martial: 'Martial',
};

export interface SkillBookDef {
  skillId: AbilityId;
  school: SkillSchool;
  /** The base attribute used to read it (success chance). */
  studyAttribute: AttributeKey;
  /** Minimum BASE score of `studyAttribute` to read the book at all (none = anyone). */
  minimum?: number;
}

const book = (b: SkillBookDef) => b;

export const SKILL_BOOKS = {
  // arcane
  magic_missile: book({
    skillId: 'magic_missile',
    school: 'arcane',
    studyAttribute: 'intellect',
    minimum: 7,
  }),
  frost_ray: book({
    skillId: 'frost_ray',
    school: 'arcane',
    studyAttribute: 'intellect',
    minimum: 7,
  }),
  arcane_shield: book({
    skillId: 'arcane_shield',
    school: 'arcane',
    studyAttribute: 'intellect',
    minimum: 6,
  }),
  fireball: book({
    skillId: 'fireball',
    school: 'arcane',
    studyAttribute: 'intellect',
    minimum: 8,
  }),
  lightning_bolt: book({
    skillId: 'lightning_bolt',
    school: 'arcane',
    studyAttribute: 'intellect',
    minimum: 8,
  }),
  paralyze: book({
    skillId: 'paralyze',
    school: 'arcane',
    studyAttribute: 'intellect',
    minimum: 9,
  }),
  // divine / support
  cure_wounds: book({
    skillId: 'cure_wounds',
    school: 'divine',
    studyAttribute: 'will',
    minimum: 7,
  }),
  shield_of_faith: book({
    skillId: 'shield_of_faith',
    school: 'divine',
    studyAttribute: 'will',
    minimum: 6,
  }),
  guiding_bolt: book({
    skillId: 'guiding_bolt',
    school: 'divine',
    studyAttribute: 'will',
    minimum: 7,
  }),
  prayer_of_healing: book({
    skillId: 'prayer_of_healing',
    school: 'divine',
    studyAttribute: 'will',
    minimum: 8,
  }),
  bane: book({ skillId: 'bane', school: 'divine', studyAttribute: 'will', minimum: 8 }),
  // half-casters: the requirement is on the casting attribute, kept low
  divine_smite: book({
    skillId: 'divine_smite',
    school: 'hybrid',
    studyAttribute: 'will',
    minimum: 6,
  }),
  hunters_mark: book({
    skillId: 'hunters_mark',
    school: 'hybrid',
    studyAttribute: 'will',
    minimum: 6,
  }),
  searing_strike: book({
    skillId: 'searing_strike',
    school: 'hybrid',
    studyAttribute: 'intellect',
    minimum: 6,
  }),
  ensnaring_strike: book({
    skillId: 'ensnaring_strike',
    school: 'hybrid',
    studyAttribute: 'will',
    minimum: 6,
  }),
  // martial techniques
  whirlwind: book({ skillId: 'whirlwind', school: 'martial', studyAttribute: 'might', minimum: 8 }),
  second_wind: book({ skillId: 'second_wind', school: 'martial', studyAttribute: 'endurance' }),
  precise_strike: book({
    skillId: 'precise_strike',
    school: 'martial',
    studyAttribute: 'precision',
    minimum: 7,
  }),
} satisfies Partial<Record<AbilityId, SkillBookDef>>;

export type BookSkillId = keyof typeof SKILL_BOOKS;

/** Item definition id of the book that teaches a skill. */
export const bookItemId = (skillId: string) => `book_${skillId}`;

export function getSkillBook(skillId: string): SkillBookDef | undefined {
  return (SKILL_BOOKS as Record<string, SkillBookDef>)[skillId];
}

/** The book behind an item definition id (`book_<skill>`), if any. */
export function bookOfItem(defId: string): SkillBookDef | undefined {
  return defId.startsWith('book_') ? getSkillBook(defId.slice(5)) : undefined;
}

/** Item definitions for every book (merged into ITEMS by `items.ts`). */
export const BOOK_ITEMS: Record<
  string,
  { id: string; name: string; description: string; kind: ItemKind; slots: EquipSlot[] }
> = Object.fromEntries(
  Object.values(SKILL_BOOKS).map((b: SkillBookDef) => {
    const id = bookItemId(b.skillId);
    const skill = ABILITIES[b.skillId];
    return [
      id,
      {
        id,
        name: `Book: ${skill.name}`,
        description: `Teaches ${skill.name} or raises its rank. The book is consumed when read.`,
        kind: 'book' as const,
        slots: [],
      },
    ];
  }),
);
