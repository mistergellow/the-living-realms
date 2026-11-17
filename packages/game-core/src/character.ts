/*
 * Character creation rules (phase 1: name only; appearance is validated by the
 * shared zod schema). Attributes, origin, nation, etc. are future-phase design.
 */

export const CHARACTER_NAME_MIN = 3;
export const CHARACTER_NAME_MAX = 20;

/** Letters, separated by single spaces, apostrophes or hyphens. Must start/end with a letter. */
const NAME_PATTERN = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

export type NameValidation = { ok: true; name: string } | { ok: false; reason: string };

/** Collapse whitespace and trim. Applied before validation and storage. */
export function normalizeCharacterName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Key used for case-insensitive uniqueness (stored/indexed by the database as lower(name)). */
export function characterNameKey(name: string): string {
  return normalizeCharacterName(name).toLowerCase();
}

export function validateCharacterName(raw: string): NameValidation {
  const name = normalizeCharacterName(raw);
  const length = [...name].length;
  if (length < CHARACTER_NAME_MIN)
    return { ok: false, reason: `Name must be at least ${CHARACTER_NAME_MIN} characters.` };
  if (length > CHARACTER_NAME_MAX)
    return { ok: false, reason: `Name must be at most ${CHARACTER_NAME_MAX} characters.` };
  if (!NAME_PATTERN.test(name))
    return {
      ok: false,
      reason: 'Name may only contain letters, single spaces, apostrophes and hyphens.',
    };
  return { ok: true, name };
}
