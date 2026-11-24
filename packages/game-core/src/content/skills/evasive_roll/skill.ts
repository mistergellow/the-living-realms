import { defineSkill, SELF } from '../define.js';

/*
 * Evasive Roll (Agility) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_evasive_roll.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'evasive_roll',
  name: 'Evasive Roll',
  description: 'Roll out of harm’s way: a lot of Dodge for 1 Focus.',
  focusCost: 1,
  manaCost: 0,
  targeting: SELF,
  effects: [
    {
      kind: 'block',
      min: 9,
      max: 11,
    },
  ],
  scaling: {},
  requirements: {
    agility: 6,
  },
});
