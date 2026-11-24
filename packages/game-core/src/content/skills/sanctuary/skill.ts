import { defineSkill, ALL_ALLIES } from '../define.js';

/*
 * Sanctuary (two attributes) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_sanctuary.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'sanctuary',
  name: 'Sanctuary',
  description: 'Holy ground: Dodge and Regeneration for every ally.',
  focusCost: 3,
  manaCost: 6,
  targeting: ALL_ALLIES,
  effects: [
    {
      kind: 'block',
      min: 4,
      max: 5,
    },
    {
      kind: 'status',
      status: 'regen',
      turns: 2,
      value: 3,
    },
  ],
  scaling: {
    will: 0.5,
    endurance: 0.5,
  },
  requirements: {
    will: 7,
    endurance: 6,
  },
});
