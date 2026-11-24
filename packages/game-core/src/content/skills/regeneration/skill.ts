import { defineSkill, ALLY } from '../define.js';

/*
 * Regeneration (Will) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_regeneration.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'regeneration',
  name: 'Regeneration',
  description: 'An ally regains 4 health at the start of each round, for 3 rounds.',
  focusCost: 1,
  manaCost: 3,
  targeting: ALLY,
  effects: [
    {
      kind: 'status',
      status: 'regen',
      turns: 3,
      value: 4,
    },
  ],
  scaling: {
    will: 1,
  },
  requirements: {
    will: 7,
  },
});
