import { defineSkill, NEAREST } from '../define.js';

/*
 * Quick Jab (free) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_quick_jab.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'quick_jab',
  name: 'Quick Jab',
  description: 'A cheap, fast strike at the nearest enemy.',
  focusCost: 1,
  manaCost: 0,
  targeting: NEAREST,
  effects: [
    {
      kind: 'damage',
      damageType: 'physical',
      min: 4,
      max: 5,
    },
  ],
  scaling: {
    might: 0.5,
    agility: 0.5,
  },
});
