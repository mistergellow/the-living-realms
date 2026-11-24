import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAbility, getSkill, SKILLS } from '../src/index.js';

/* Request #79: icons are found by file name, so the names must be real ids. */
const content = fileURLToPath(new URL('../src/content', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe('content folders (request #79)', () => {
  it('every skill has a folder named after it', () => {
    const folders = readdirSync(join(content, 'skills')).filter((f) => !f.endsWith('.ts'));
    expect(folders.sort()).toEqual(Object.keys(SKILLS).sort());
    for (const id of folders) expect(getSkill(id)?.id).toBe(id);
  });

  it('every ability and skill icon is named after a real ability', () => {
    for (const file of walk(content)) {
      const name = file.slice(file.lastIndexOf('/') + 1);
      const ability = name.match(/^_ability_icon_(.+)\.png$/)?.[1];
      const skill = name.match(/^_skill_icon_(.+)\.png$/)?.[1];
      if (ability) expect(getAbility(ability), name).toBeDefined();
      if (skill) expect(getSkill(skill), name).toBeDefined();
    }
  });
});
