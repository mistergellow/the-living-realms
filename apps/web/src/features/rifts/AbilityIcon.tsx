import { getAbility, skillLevelRarity } from '@realms/game-core';
import { ABILITY_ICON } from '../items/art';

/*
 * Ability icons. Request #79: painted icons come from the content folders
 * (`_ability_icon_<id>.png` in a weapon's folder, `_skill_icon_<id>.png` in a
 * skill's folder). Abilities without one keep the PLACEHOLDER (request #30):
 * a coloured tile per kind of action with a simple white glyph.
 */

export type AbilitySchool =
  'physical' | 'ranged' | 'magic' | 'heal' | 'block' | 'status' | 'utility';

/** Glyphs drawn in a 24×24 box (stroke paths). */
const GLYPHS = {
  sword: 'M14.5 4H20v5.5L9 20.5 3.5 15 14.5 4ZM5 13l6 6M3 21l3-3',
  slash: 'M4 18C9 16 15 11 19 4M7 20c5-2 10-7 13-13',
  axe: 'M8 21 17 6M13 4c4-2 8 1 8 5-3 0-5-1-6-3M15 8l-4-1',
  dagger: 'M15 3l3 3-9 9-3-3 9-9ZM6 12l-2 2 6 6 2-2M5 19l-2 2',
  drop: 'M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11Z',
  arrow: 'M4 20 19 5M14 5h5v5M4 20l2-5M4 20l5-2',
  volley: 'M3 15 13 5M9 5h4v4M8 20l10-10M14 10h4v4M3 15l1.5-3.5M8 20l1.5-3.5',
  target:
    'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
  staff: 'M6 21 16 8M15 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
  orb: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 3 1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5L12 7Z',
  flame: 'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-6 1-8Z',
  bolt: 'M13 2 5 14h6l-1 8 8-12h-6l1-8Z',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Zm10-3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10ZM12 9v6M9 12h6',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  shield: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  shieldPlus: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3ZM12 8v8M8 12h8',
  rune: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v10M8 9l8 6M16 9l-8 6',
  swap: 'M4 8h13l-3-3M20 16H7l3 3',
  cloak: 'M12 3c-4 3-6 8-6 18h12c0-10-2-15-6-18ZM9 21c0-4 1-7 3-9 2 2 3 5 3 9',
  fist: 'M7 10V6a2 2 0 0 1 4 0v4M11 9V5a2 2 0 0 1 4 0v5M15 10V7a2 2 0 0 1 4 0v6c0 4-3 7-7 7h-1c-3 0-5-2-6-5l-1-3c-.5-1.5 1.5-2.5 2.5-1L7 13',
} as const;
type Glyph = keyof typeof GLYPHS;

const GLYPH_BY_ABILITY: Record<string, Glyph> = {
  slash: 'slash',
  cleave: 'sword',
  rend: 'drop',
  chop: 'axe',
  sunder: 'axe',
  stab: 'dagger',
  puncture: 'drop',
  backstab: 'dagger',
  shadowstep: 'cloak',
  aimed_shot: 'arrow',
  volley: 'volley',
  marking_shot: 'target',
  staff_strike: 'staff',
  arcane_bolt: 'orb',
  firebolt: 'flame',
  spark: 'bolt',
  hex: 'eye',
  mend: 'heart',
  blessing: 'sun',
  ward: 'rune',
  raise_shield: 'shield',
  shield_wall: 'shield',
  guard_ally: 'shieldPlus',
  swap_position: 'swap',
  block: 'shield',
  thrust: 'sword',
  crush: 'fist',
  unarmed_strike: 'fist',
  // request #45
  great_swing: 'slash',
  executioner: 'sword',
  great_chop: 'axe',
  rampage: 'drop',
  hack: 'axe',
  throw_axe: 'axe',
  hammer_blow: 'fist',
  concuss: 'sun',
  great_smash: 'fist',
  earthshaker: 'bolt',
  spiked_blow: 'drop',
  flail_spin: 'drop',
  lance_thrust: 'sword',
  charge: 'target',
  bolt_shot: 'arrow',
  piercing_bolt: 'arrow',
  fireball: 'flame',
  // request #46
  skewer: 'sword',
  stagger: 'fist',
  focused_bolt: 'orb',
  smite: 'sun',
  radiance: 'heart',
  chakram_throw: 'orb',
  ricochet: 'volley',
  reap: 'slash',
  soul_harvest: 'drop',
  sling_stone: 'arrow',
  stunning_shot: 'target',
};

/** The kind of action, from the ability's effects (decides the tile colour). */
export function abilitySchool(abilityId: string): AbilitySchool {
  const a = getAbility(abilityId);
  if (!a) return 'utility';
  const dmg = a.effects.find((e) => e.kind === 'damage');
  if (dmg && dmg.kind === 'damage')
    return dmg.damageType === 'physical'
      ? 'physical'
      : dmg.damageType === 'ranged'
        ? 'ranged'
        : 'magic';
  if (a.effects.some((e) => e.kind === 'heal')) return 'heal';
  if (a.effects.some((e) => e.kind === 'block')) return 'block';
  if (a.effects.some((e) => e.kind === 'status')) return 'status';
  return 'utility';
}

const FALLBACK: Record<AbilitySchool, Glyph> = {
  physical: 'sword',
  ranged: 'arrow',
  magic: 'orb',
  heal: 'heart',
  block: 'shield',
  status: 'eye',
  utility: 'swap',
};

export function AbilityIcon({
  abilityId,
  className,
  level,
}: {
  abilityId: string;
  className?: string;
  /** Request #80: a skill's level colours its background (rarity colours). */
  level?: number;
}) {
  const school = abilitySchool(abilityId);
  const rarity = level ? skillLevelRarity(level) : undefined;
  const painted = ABILITY_ICON[abilityId];
  if (painted)
    return (
      <span
        className={['ability-icon', 'painted', `school-${school}`, className]
          .filter(Boolean)
          .join(' ')}
        data-rarity={rarity}
        aria-hidden
      >
        <img src={painted} alt="" draggable={false} />
      </span>
    );
  const glyph = GLYPH_BY_ABILITY[abilityId] ?? FALLBACK[school];
  return (
    <span
      className={['ability-icon', `school-${school}`, className].filter(Boolean).join(' ')}
      data-rarity={rarity}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={GLYPHS[glyph]} />
      </svg>
    </span>
  );
}
