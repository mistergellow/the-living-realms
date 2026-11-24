import { defineSkill, NEAREST } from '../define.js';

/*
 * Venom Strike (two attributes) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_venom_strike.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'venom_strike',
  name: 'Venom Strike',
  description: 'A poisoned cut at the nearest enemy: Bleed 4 for 3 rounds.',
  focusCost: 2,
  manaCost: 0,
  targeting: NEAREST,
  effects: [
    {
      kind: 'damage',
      damageType: 'physical',
      min: 4,
      max: 5,
    },
    {
      kind: 'status',
      status: 'bleed',
      turns: 3,
      value: 4,
    },
  ],
  scaling: {
    agility: 0.5,
    intellect: 0.5,
  },
  requirements: {
    agility: 6,
    intellect: 6,
  },
});
