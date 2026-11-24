import { defineSkill, ANY_ENEMY } from '../define.js';

/*
 * Throw Rock (free) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_throw_rock.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'throw_rock',
  name: 'Throw Rock',
  description: 'Pick up a rock and throw it at any enemy.',
  focusCost: 1,
  manaCost: 0,
  targeting: ANY_ENEMY,
  effects: [
    {
      kind: 'damage',
      damageType: 'ranged',
      min: 3,
      max: 4,
    },
  ],
  scaling: {
    precision: 1,
  },
});
