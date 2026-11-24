import { defineSkill, ALLY } from '../define.js';

/*
 * Blessing of Might (Will) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_blessing_of_might.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'blessing_of_might',
  name: 'Blessing of Might',
  description: 'An ally gains +3 Strength for 3 rounds.',
  focusCost: 1,
  manaCost: 2,
  targeting: ALLY,
  effects: [
    {
      kind: 'status',
      status: 'strength',
      turns: 3,
      value: 3,
    },
  ],
  scaling: {},
  requirements: {
    will: 6,
  },
});
