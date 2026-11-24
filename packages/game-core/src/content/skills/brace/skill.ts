import { defineSkill, SELF } from '../define.js';

/*
 * Brace (free) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_brace.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'brace',
  name: 'Brace',
  description: 'Plant your feet: a lot of Dodge until your next turn.',
  focusCost: 2,
  manaCost: 0,
  targeting: SELF,
  effects: [
    {
      kind: 'block',
      min: 10,
      max: 10,
    },
  ],
  scaling: {},
});
