import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Ignite (Intellect) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_ignite.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'ignite',
  name: 'Ignite',
  description: 'Set any enemy ablaze: Burn 4 for 3 rounds.',
  focusCost: 1,
  manaCost: 3,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'status',
      status: 'burn',
      turns: 3,
      value: 4,
    },
  ],
  scaling: {
    intellect: 1,
  },
  requirements: {
    intellect: 6,
  },
});
