import { defineSkill, SELF } from '../define.js';

/*
 * Mana Shield (Intellect) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_mana_shield.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'mana_shield',
  name: 'Mana Shield',
  description: 'Turn mana into a barrier: Dodge.',
  focusCost: 1,
  manaCost: 3,
  targeting: SELF,
  effects: [
    {
      kind: 'block',
      min: 10,
      max: 10,
    },
  ],
  scaling: {},
  requirements: {
    intellect: 7,
  },
});
