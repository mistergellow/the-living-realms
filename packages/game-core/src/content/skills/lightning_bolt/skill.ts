import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Lightning Bolt (Intellect) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_lightning_bolt.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'lightning_bolt',
  name: 'Lightning Bolt',
  description: 'A bolt of lightning at any enemy.',
  focusCost: 2,
  manaCost: 4,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'damage',
      damageType: 'magic',
      min: 9,
      max: 12,
    },
  ],
  scaling: {
    intellect: 1,
  },
  requirements: {
    intellect: 6,
  },
});
