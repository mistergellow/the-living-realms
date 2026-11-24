import { defineSkill, ALLY } from '../define.js';

/*
 * Purify (Will) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_purify.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'purify',
  name: 'Purify',
  description: 'Remove every harmful status from an ally and heal them a little.',
  focusCost: 1,
  manaCost: 2,
  targeting: ALLY,
  effects: [
    {
      kind: 'cleanse',
    },
    {
      kind: 'heal',
      min: 3,
      max: 4,
    },
  ],
  scaling: {
    will: 1,
  },
  requirements: {
    will: 6,
  },
});
