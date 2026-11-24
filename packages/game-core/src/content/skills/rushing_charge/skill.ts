import { defineSkill, NEAREST } from '../define.js';

/*
 * Rushing Charge (Might) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_rushing_charge.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'rushing_charge',
  name: 'Rushing Charge',
  description: 'Charge into the nearest enemy and knock it senseless (Stun).',
  focusCost: 3,
  manaCost: 0,
  targeting: NEAREST,
  effects: [
    {
      kind: 'damage',
      damageType: 'physical',
      min: 8,
      max: 10,
    },
    {
      kind: 'status',
      status: 'stun',
      turns: 1,
    },
  ],
  scaling: {
    might: 0.6,
    endurance: 0.4,
  },
  requirements: {
    might: 6,
  },
});
