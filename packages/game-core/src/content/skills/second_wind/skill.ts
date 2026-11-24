import { defineSkill, SELF } from '../define.js';

/*
 * Second Wind (free) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_second_wind.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'second_wind',
  name: 'Second Wind',
  description: 'Catch your breath and recover some health.',
  focusCost: 1,
  manaCost: 0,
  targeting: SELF,
  effects: [
    {
      kind: 'heal',
      min: 6,
      max: 8,
    },
  ],
  scaling: {
    endurance: 1,
  },
});
