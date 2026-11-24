import { defineSkill, NEAREST_TWO } from '../define.js';

/*
 * Ground Slam (Might) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_ground_slam.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'ground_slam',
  name: 'Ground Slam',
  description: 'Slam the ground: the two nearest enemies are hit and Weakened.',
  focusCost: 3,
  manaCost: 0,
  targeting: NEAREST_TWO,
  effects: [
    {
      kind: 'damage',
      damageType: 'physical',
      min: 6,
      max: 8,
    },
    {
      kind: 'status',
      status: 'weaken',
      turns: 2,
      value: 25,
    },
  ],
  scaling: {
    might: 1,
  },
  requirements: {
    might: 8,
  },
});
