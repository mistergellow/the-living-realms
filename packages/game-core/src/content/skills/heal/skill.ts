import { defineSkill, ALLY } from '../define.js';

/*
 * Heal (Will) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_heal.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'heal',
  name: 'Heal',
  description: 'Mend an ally’s wounds.',
  focusCost: 2,
  manaCost: 4,
  targeting: ALLY,
  effects: [
    {
      kind: 'heal',
      min: 10,
      max: 13,
    },
  ],
  scaling: {
    will: 1,
  },
  requirements: {
    will: 6,
  },
});
