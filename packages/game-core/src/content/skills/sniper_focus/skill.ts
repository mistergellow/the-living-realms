import { defineSkill, SELF } from '../define.js';

/*
 * Sniper’s Focus (two attributes) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_sniper_focus.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'sniper_focus',
  name: 'Sniper’s Focus',
  description: 'Steady your aim: +3 Strength and Dodge for 2 rounds.',
  focusCost: 1,
  manaCost: 0,
  targeting: SELF,
  effects: [
    {
      kind: 'status',
      status: 'strength',
      turns: 2,
      value: 3,
    },
    {
      kind: 'block',
      min: 5,
      max: 5,
    },
  ],
  scaling: {},
  requirements: {
    precision: 6,
    agility: 6,
  },
});
