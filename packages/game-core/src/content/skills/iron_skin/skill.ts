import { defineSkill, SELF } from '../define.js';

/*
 * Iron Skin (Endurance) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_iron_skin.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'iron_skin',
  name: 'Iron Skin',
  description: 'Harden yourself: Dodge and Thorns 3 for 2 rounds.',
  focusCost: 2,
  manaCost: 0,
  targeting: SELF,
  effects: [
    {
      kind: 'block',
      min: 8,
      max: 8,
    },
    {
      kind: 'status',
      status: 'thorns',
      turns: 2,
      value: 3,
    },
  ],
  scaling: {},
  requirements: {
    endurance: 6,
  },
});
