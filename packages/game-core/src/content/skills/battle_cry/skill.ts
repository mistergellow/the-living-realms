import { defineSkill, ALL_ALLIES } from '../define.js';

/*
 * Battle Cry (free) — everything about this skill in one place (request #79).
 * Icon: drop `_skill_icon_battle_cry.png` (100×100) in this folder.
 */
export default defineSkill({
  id: 'battle_cry',
  name: 'Battle Cry',
  description: 'A roar that fires up the whole party: +2 Strength for 2 rounds.',
  focusCost: 2,
  manaCost: 0,
  targeting: ALL_ALLIES,
  effects: [
    {
      kind: 'status',
      status: 'strength',
      turns: 2,
      value: 2,
    },
  ],
  scaling: {},
});
