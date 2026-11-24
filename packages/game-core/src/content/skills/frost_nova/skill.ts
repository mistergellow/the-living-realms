import { defineSkill, ALL_ENEMIES } from '../define.js';

/*
 * Frost Nova (Intellect) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_frost_nova.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'frost_nova',
  name: 'Frost Nova',
  description: 'A wave of frost: hits every enemy and Weakens them.',
  focusCost: 3,
  manaCost: 5,
  targeting: ALL_ENEMIES,
  effects: [
    {
      kind: 'damage',
      damageType: 'magic',
      min: 4,
      max: 5,
    },
    {
      kind: 'status',
      status: 'weaken',
      turns: 1,
      value: 25,
    },
  ],
  scaling: {
    intellect: 1,
  },
  requirements: {
    intellect: 7,
  },
});
