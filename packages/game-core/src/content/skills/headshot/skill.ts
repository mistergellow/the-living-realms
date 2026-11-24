import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Headshot (Precision) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_headshot.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'headshot',
  name: 'Headshot',
  description: 'A careful shot at any enemy; double damage if it is Marked.',
  focusCost: 3,
  manaCost: 0,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'damage',
      damageType: 'ranged',
      min: 9,
      max: 11,
      bonusVs: {
        status: 'mark',
        multiplier: 2,
      },
    },
  ],
  scaling: {
    precision: 1,
  },
  requirements: {
    precision: 7,
  },
});
