import { defineSkill, NEAREST } from '../define.js';

/*
 * Flurry (Agility) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_flurry.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'flurry',
  name: 'Flurry',
  description: 'Three quick strikes at the nearest enemy.',
  focusCost: 2,
  manaCost: 0,
  targeting: NEAREST,
  effects: [
    {
      kind: 'damage',
      damageType: 'physical',
      min: 3,
      max: 4,
    },
    {
      kind: 'damage',
      damageType: 'physical',
      min: 3,
      max: 4,
    },
    {
      kind: 'damage',
      damageType: 'physical',
      min: 3,
      max: 4,
    },
  ],
  scaling: {
    agility: 1,
  },
  requirements: {
    agility: 7,
  },
});
