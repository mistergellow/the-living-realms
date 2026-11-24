import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Expose Weakness (Precision) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_expose_weakness.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'expose_weakness',
  name: 'Expose Weakness',
  description:
    'Point out the gaps in an enemy’s guard: Marked (takes more damage) and Weakened (deals less). Both grow with the skill level.',
  focusCost: 1,
  manaCost: 0,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'status',
      status: 'mark',
      turns: 2,
      value: 25,
    },
    {
      kind: 'status',
      status: 'weaken',
      turns: 2,
      value: 25,
    },
  ],
  scaling: {},
  requirements: {
    precision: 6,
  },
});
