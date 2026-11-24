import { defineSkill, ALL_ALLIES } from '../define.js';

/*
 * Guardian (Endurance) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_guardian.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'guardian',
  name: 'Guardian',
  description: 'Shield the whole party: Dodge for every ally.',
  focusCost: 3,
  manaCost: 0,
  targeting: ALL_ALLIES,
  effects: [
    {
      kind: 'block',
      min: 6,
      max: 7,
    },
  ],
  scaling: {
    endurance: 1,
  },
  requirements: {
    endurance: 7,
  },
});
