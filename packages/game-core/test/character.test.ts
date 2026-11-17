import { describe, expect, it } from 'vitest';
import { characterNameKey, validateCharacterName } from '../src/character.js';

describe('character name rules', () => {
  it('accepts valid names and normalizes whitespace', () => {
    expect(validateCharacterName('  Aria   Vell ')).toEqual({ ok: true, name: 'Aria Vell' });
    expect(validateCharacterName("O'Neil")).toMatchObject({ ok: true });
    expect(validateCharacterName('Jean-Luc')).toMatchObject({ ok: true });
    expect(validateCharacterName('Ærøn')).toMatchObject({ ok: true });
  });

  it('rejects names that are too short, too long or malformed', () => {
    expect(validateCharacterName('Al').ok).toBe(false);
    expect(validateCharacterName('A'.repeat(21)).ok).toBe(false);
    expect(validateCharacterName('R2D2').ok).toBe(false);
    expect(validateCharacterName('--Bob').ok).toBe(false);
    expect(validateCharacterName("Bob''s").ok).toBe(false);
    expect(validateCharacterName('<script>').ok).toBe(false);
  });

  it('builds case-insensitive keys', () => {
    expect(characterNameKey(' ARIA  vell')).toBe('aria vell');
  });
});
