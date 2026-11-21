import type { AttributeKey, Attributes, TestRollView } from '@realms/shared';
import type { Rng } from '../combat/rng.js';
import { EXPLORATION_RULES } from '../content/rooms.js';

/*
 * BASE STATS RULE (request #31, fundamental): every exploration test — Random
 * Events, secret-room searches, characteristic checks, any roll in the Rift —
 * uses only a character's BASE attributes (creation + spent points). Equipment,
 * accessories, buffs and any other source never count.
 *
 * `BaseAttributes` is a branded type: the only way to make one is
 * `asBaseAttributes`, called where base values are read (the character row
 * in the server, `baseAttributesOf`). Tests only accept `BaseAttributes`, so
 * total (equipped) attributes cannot be passed by mistake.
 */

declare const BASE: unique symbol;
export type BaseAttributes = Attributes & { readonly [BASE]: true };

/** Mark attribute values as BASE values (no equipment, no buffs). */
export const asBaseAttributes = (a: Attributes): BaseAttributes => ({ ...a }) as BaseAttributes;

/** The centralised way to read a base stat for any exploration check. */
export function baseStat(who: { baseAttributes: BaseAttributes }, attribute: AttributeKey): number {
  return who.baseAttributes[attribute];
}

/** Roll 1..testDie + BASE attribute against a difficulty. */
export function attributeTest(
  who: { characterId: string; name: string; baseAttributes: BaseAttributes },
  attribute: AttributeKey,
  difficulty: number,
  rng: Rng,
): TestRollView {
  const base = baseStat(who, attribute);
  const roll = 1 + rng.int(EXPLORATION_RULES.testDie);
  const total = base + roll;
  return {
    testerId: who.characterId,
    testerName: who.name,
    attribute,
    base,
    roll,
    total,
    difficulty,
    success: total >= difficulty,
  };
}

/** Chance (0–1) that a BASE value passes a difficulty — for showing odds to players. */
export function testChance(base: number, difficulty: number): number {
  const need = difficulty - base;
  const die = EXPLORATION_RULES.testDie;
  if (need <= 1) return 1;
  if (need > die) return 0;
  return (die - need + 1) / die;
}
