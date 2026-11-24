import { defineSkill, NEAREST } from '../define.js';

/*
 * Thunder Strike (two attributes) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_thunder_strike.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'thunder_strike',
  name: 'Thunder Strike',
  description: 'A blow charged with lightning: magic damage and Stun.',
  focusCost: 3,
  manaCost: 3,
  targeting: NEAREST,
  effects: [
    {
      kind: 'damage',
      damageType: 'magic',
      min: 9,
      max: 11,
    },
    {
      kind: 'status',
      status: 'stun',
      turns: 1,
    },
  ],
  scaling: {
    might: 0.5,
    intellect: 0.5,
  },
  requirements: {
    might: 7,
    intellect: 6,
  },
});
