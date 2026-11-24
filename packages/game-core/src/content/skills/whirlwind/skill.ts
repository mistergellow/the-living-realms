import { defineSkill, NEAREST_TWO } from '../define.js';

/*
 * Whirlwind (Might) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_whirlwind.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'whirlwind',
  name: 'Whirlwind',
  description: 'Spin with your blade: hits the two nearest enemies.',
  focusCost: 3,
  manaCost: 0,
  targeting: NEAREST_TWO,
  effects: [
    {
      kind: 'damage',
      damageType: 'physical',
      min: 8,
      max: 10,
    },
  ],
  scaling: {
    might: 0.6,
    agility: 0.4,
  },
  requirements: {
    might: 7,
  },
});
