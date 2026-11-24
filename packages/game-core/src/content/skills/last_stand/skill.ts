import { defineSkill, SELF } from '../define.js';

/*
 * Last Stand (Endurance) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_last_stand.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'last_stand',
  name: 'Last Stand',
  description: 'Refuse to fall: heal yourself a lot.',
  focusCost: 2,
  manaCost: 0,
  targeting: SELF,
  effects: [
    {
      kind: 'heal',
      min: 12,
      max: 15,
    },
  ],
  scaling: {
    endurance: 1,
  },
  requirements: {
    endurance: 8,
  },
});
