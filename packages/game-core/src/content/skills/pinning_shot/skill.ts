import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Pinning Shot (Precision) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_pinning_shot.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'pinning_shot',
  name: 'Pinning Shot',
  description: 'Pin any enemy in place: it cannot act next round.',
  focusCost: 3,
  manaCost: 0,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'damage',
      damageType: 'ranged',
      min: 4,
      max: 5,
    },
    {
      kind: 'status',
      status: 'stun',
      turns: 1,
    },
  ],
  scaling: {
    precision: 1,
  },
  requirements: {
    precision: 8,
  },
});
