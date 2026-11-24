import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Holy Light (Will) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_holy_light.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'holy_light',
  name: 'Holy Light',
  description: 'A beam of holy light at any enemy.',
  focusCost: 2,
  manaCost: 3,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'damage',
      damageType: 'magic',
      min: 8,
      max: 10,
    },
  ],
  scaling: {
    will: 1,
  },
  requirements: {
    will: 7,
  },
});
