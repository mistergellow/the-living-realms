import { defineSkill, SELF } from '../define.js';

/*
 * Berserk (Might) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_berserk.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'berserk',
  name: 'Berserk',
  description: 'Give in to rage: +4 Strength for 3 rounds.',
  focusCost: 2,
  manaCost: 0,
  targeting: SELF,
  effects: [
    {
      kind: 'status',
      status: 'strength',
      turns: 3,
      value: 4,
    },
  ],
  scaling: {},
  requirements: {
    might: 7,
  },
});
