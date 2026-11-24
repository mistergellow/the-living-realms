import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Shadow Strike (Agility) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_shadow_strike.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'shadow_strike',
  name: 'Shadow Strike',
  description: 'Appear behind any enemy, strike and Mark it.',
  focusCost: 3,
  manaCost: 0,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'damage',
      damageType: 'physical',
      min: 9,
      max: 11,
    },
    {
      kind: 'status',
      status: 'mark',
      turns: 2,
      value: 25,
    },
  ],
  scaling: {
    agility: 0.6,
    precision: 0.4,
  },
  requirements: {
    agility: 8,
  },
});
