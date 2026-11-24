import { defineSkill, NEAREST } from '../define.js';

/*
 * Judgement (two attributes) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_judgement.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'judgement',
  name: 'Judgement',
  description: 'A holy blow at the nearest enemy that Weakens it.',
  focusCost: 2,
  manaCost: 2,
  targeting: NEAREST,
  effects: [
    {
      kind: 'damage',
      damageType: 'magic',
      min: 8,
      max: 10,
    },
    {
      kind: 'status',
      status: 'weaken',
      turns: 2,
      value: 25,
    },
  ],
  scaling: {
    might: 0.5,
    will: 0.5,
  },
  requirements: {
    might: 6,
    will: 6,
  },
});
