import { defineSkill, ALLY } from '../define.js';

/*
 * First Aid (free) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_first_aid.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'first_aid',
  name: 'First Aid',
  description: 'Patch up an ally and stop their bleeding.',
  focusCost: 2,
  manaCost: 0,
  targeting: ALLY,
  effects: [
    {
      kind: 'cleanse',
      statuses: ['bleed'],
    },
    {
      kind: 'heal',
      min: 5,
      max: 7,
    },
  ],
  scaling: {
    will: 0.5,
    precision: 0.5,
  },
});
