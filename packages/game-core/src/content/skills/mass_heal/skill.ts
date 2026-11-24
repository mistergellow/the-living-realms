import { defineSkill, ALL_ALLIES } from '../define.js';

/*
 * Mass Heal (Will) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_mass_heal.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'mass_heal',
  name: 'Mass Heal',
  description: 'Heal the whole party.',
  focusCost: 3,
  manaCost: 7,
  targeting: ALL_ALLIES,
  effects: [
    {
      kind: 'heal',
      min: 6,
      max: 8,
    },
  ],
  scaling: {
    will: 1,
  },
  requirements: {
    will: 9,
  },
});
