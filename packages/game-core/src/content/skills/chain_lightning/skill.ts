import { defineSkill, ALL_ENEMIES } from '../define.js';

/*
 * Chain Lightning (Intellect) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_chain_lightning.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'chain_lightning',
  name: 'Chain Lightning',
  description: 'Lightning that jumps through every enemy.',
  focusCost: 3,
  manaCost: 7,
  targeting: ALL_ENEMIES,
  effects: [
    {
      kind: 'damage',
      damageType: 'magic',
      min: 6,
      max: 8,
    },
  ],
  scaling: {
    intellect: 1,
  },
  requirements: {
    intellect: 9,
  },
});
