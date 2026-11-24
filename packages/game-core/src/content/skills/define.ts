import type { AbilityTargeting } from '../abilities.js';
import type { SkillDef } from '../skills.js';

/*
 * One folder per skill (request #79), like weapons and items:
 *
 *   skills/<id>/skill.ts              what the skill does (costs, targets, effects)
 *   skills/<id>/_skill_icon_<id>.png  its icon, 100×100
 *
 * The game finds the icon by its file name; replacing the PNG changes the art.
 * Numbers are PROVISIONAL (A100). Requirements are BASE attributes.
 */
export const defineSkill = (s: Omit<SkillDef, 'source'>): SkillDef => ({ ...s, source: 'skill' });

/** Common targets. */
export const SELF: AbilityTargeting = { side: 'self', reach: 'any', area: 'single' };
export const ALLY: AbilityTargeting = { side: 'ally', reach: 'any', area: 'single' };
export const ALL_ALLIES: AbilityTargeting = { side: 'ally', reach: 'any', area: 'all' };
export const NEAREST: AbilityTargeting = { side: 'enemy', reach: 'first', area: 'column' };
export const NEAREST_TWO: AbilityTargeting = { side: 'enemy', reach: 'first2', area: 'all' };
export const ANY_ENEMY: AbilityTargeting = { side: 'enemy', reach: 'any', area: 'column' };
export const ALL_ENEMIES: AbilityTargeting = { side: 'enemy', reach: 'any', area: 'all' };
