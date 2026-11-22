import type { Attributes } from '@realms/shared';
import type { AbilityDef, AbilityTargeting } from './abilities.js';

/*
 * Skills (request #47): powers learned from Skill Books, prepared in the 8
 * loadout slots and cast like spells. Some are free; others need BASE
 * attributes (checked when the book is read), coherent with what they do:
 * Might = brute force, Agility = speed, Precision = aimed strikes,
 * Endurance = protection, Intellect = arcane spells, Will = healing and holy.
 * PROVISIONAL numbers (A100).
 */

export type SkillDef = AbilityDef & {
  source: 'skill';
  /** BASE attributes needed to learn it; absent = anyone can learn it. */
  requirements?: Partial<Attributes>;
};

const SELF: AbilityTargeting = { side: 'self', reach: 'any', area: 'single' };
const ALLY: AbilityTargeting = { side: 'ally', reach: 'any', area: 'single' };
const ALL_ALLIES: AbilityTargeting = { side: 'ally', reach: 'any', area: 'all' };
const NEAREST: AbilityTargeting = { side: 'enemy', reach: 'first', area: 'column' };
const NEAREST_TWO: AbilityTargeting = { side: 'enemy', reach: 'first2', area: 'all' };
const ANY_ENEMY: AbilityTargeting = { side: 'enemy', reach: 'any', area: 'column' };
const ALL_ENEMIES: AbilityTargeting = { side: 'enemy', reach: 'any', area: 'all' };

const skill = (s: Omit<SkillDef, 'source'>): SkillDef => ({ ...s, source: 'skill' });

export const SKILLS = {
  // ---------------------------------------------------------------- free
  second_wind: skill({
    id: 'second_wind',
    name: 'Second Wind',
    description: 'Catch your breath and recover some health.',
    focusCost: 1,
    manaCost: 0,
    targeting: SELF,
    effects: [{ kind: 'heal', min: 6, max: 8 }],
    scaling: { endurance: 1 },
  }),
  battle_cry: skill({
    id: 'battle_cry',
    name: 'Battle Cry',
    description: 'A roar that fires up the whole party: +2 Strength for 2 rounds.',
    focusCost: 2,
    manaCost: 0,
    targeting: ALL_ALLIES,
    effects: [{ kind: 'status', status: 'strength', turns: 2, value: 2 }],
    scaling: {},
  }),
  quick_jab: skill({
    id: 'quick_jab',
    name: 'Quick Jab',
    description: 'A cheap, fast strike at the nearest enemy.',
    focusCost: 1,
    manaCost: 0,
    targeting: NEAREST,
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 5 }],
    scaling: { might: 0.5, agility: 0.5 },
  }),
  throw_rock: skill({
    id: 'throw_rock',
    name: 'Throw Rock',
    description: 'Pick up a rock and throw it at any enemy.',
    focusCost: 1,
    manaCost: 0,
    targeting: ANY_ENEMY,
    effects: [{ kind: 'damage', damageType: 'ranged', min: 3, max: 4 }],
    scaling: { precision: 1 },
  }),
  first_aid: skill({
    id: 'first_aid',
    name: 'First Aid',
    description: 'Patch up an ally and stop their bleeding.',
    focusCost: 2,
    manaCost: 0,
    targeting: ALLY,
    effects: [
      { kind: 'cleanse', statuses: ['bleed'] },
      { kind: 'heal', min: 5, max: 7 },
    ],
    scaling: { will: 0.5, precision: 0.5 },
  }),
  brace: skill({
    id: 'brace',
    name: 'Brace',
    description: 'Plant your feet: a lot of Dodge until your next turn.',
    focusCost: 2,
    manaCost: 0,
    targeting: SELF,
    effects: [{ kind: 'block', min: 10, max: 10 }],
    scaling: {},
  }),

  // ---------------------------------------------------------------- Might
  whirlwind: skill({
    id: 'whirlwind',
    name: 'Whirlwind',
    description: 'Spin with your blade: hits the two nearest enemies.',
    focusCost: 3,
    manaCost: 0,
    targeting: NEAREST_TWO,
    effects: [{ kind: 'damage', damageType: 'physical', min: 8, max: 10 }],
    scaling: { might: 0.6, agility: 0.4 },
    requirements: { might: 7 },
  }),
  rushing_charge: skill({
    id: 'rushing_charge',
    name: 'Rushing Charge',
    description: 'Charge into the nearest enemy and knock it senseless (Stun).',
    focusCost: 3,
    manaCost: 0,
    targeting: NEAREST,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 8, max: 10 },
      { kind: 'status', status: 'stun', turns: 1 },
    ],
    scaling: { might: 0.6, endurance: 0.4 },
    requirements: { might: 6 },
  }),
  ground_slam: skill({
    id: 'ground_slam',
    name: 'Ground Slam',
    description: 'Slam the ground: the two nearest enemies are hit and Weakened.',
    focusCost: 3,
    manaCost: 0,
    targeting: NEAREST_TWO,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 6, max: 8 },
      { kind: 'status', status: 'weaken', turns: 2 },
    ],
    scaling: { might: 1 },
    requirements: { might: 8 },
  }),
  berserk: skill({
    id: 'berserk',
    name: 'Berserk',
    description: 'Give in to rage: +4 Strength for 3 rounds.',
    focusCost: 2,
    manaCost: 0,
    targeting: SELF,
    effects: [{ kind: 'status', status: 'strength', turns: 3, value: 4 }],
    scaling: {},
    requirements: { might: 7 },
  }),

  // ---------------------------------------------------------------- Agility
  flurry: skill({
    id: 'flurry',
    name: 'Flurry',
    description: 'Three quick strikes at the nearest enemy.',
    focusCost: 2,
    manaCost: 0,
    targeting: NEAREST,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 3, max: 4 },
      { kind: 'damage', damageType: 'physical', min: 3, max: 4 },
      { kind: 'damage', damageType: 'physical', min: 3, max: 4 },
    ],
    scaling: { agility: 1 },
    requirements: { agility: 7 },
  }),
  evasive_roll: skill({
    id: 'evasive_roll',
    name: 'Evasive Roll',
    description: 'Roll out of harm’s way: a lot of Dodge for 1 Focus.',
    focusCost: 1,
    manaCost: 0,
    targeting: SELF,
    effects: [{ kind: 'block', min: 9, max: 11 }],
    scaling: {},
    requirements: { agility: 6 },
  }),
  shadow_strike: skill({
    id: 'shadow_strike',
    name: 'Shadow Strike',
    description: 'Appear behind any enemy, strike and Mark it.',
    focusCost: 3,
    manaCost: 0,
    targeting: ANY_ENEMY,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 9, max: 11 },
      { kind: 'status', status: 'mark', turns: 2 },
    ],
    scaling: { agility: 0.6, precision: 0.4 },
    requirements: { agility: 8 },
  }),

  // ---------------------------------------------------------------- Precision
  headshot: skill({
    id: 'headshot',
    name: 'Headshot',
    description: 'A careful shot at any enemy; double damage if it is Marked.',
    focusCost: 3,
    manaCost: 0,
    targeting: ANY_ENEMY,
    effects: [
      {
        kind: 'damage',
        damageType: 'ranged',
        min: 9,
        max: 11,
        bonusVs: { status: 'mark', multiplier: 2 },
      },
    ],
    scaling: { precision: 1 },
    requirements: { precision: 7 },
  }),
  expose_weakness: skill({
    id: 'expose_weakness',
    name: 'Expose Weakness',
    description: 'Point out the gaps in an enemy’s guard: Marked and Weakened.',
    focusCost: 1,
    manaCost: 0,
    targeting: ANY_ENEMY,
    effects: [
      { kind: 'status', status: 'mark', turns: 2 },
      { kind: 'status', status: 'weaken', turns: 2 },
    ],
    scaling: {},
    requirements: { precision: 6 },
  }),
  pinning_shot: skill({
    id: 'pinning_shot',
    name: 'Pinning Shot',
    description: 'Pin any enemy in place: it cannot act next round.',
    focusCost: 3,
    manaCost: 0,
    targeting: ANY_ENEMY,
    effects: [
      { kind: 'damage', damageType: 'ranged', min: 4, max: 5 },
      { kind: 'status', status: 'stun', turns: 1 },
    ],
    scaling: { precision: 1 },
    requirements: { precision: 8 },
  }),

  // ---------------------------------------------------------------- Endurance
  iron_skin: skill({
    id: 'iron_skin',
    name: 'Iron Skin',
    description: 'Harden yourself: Dodge and Thorns 3 for 2 rounds.',
    focusCost: 2,
    manaCost: 0,
    targeting: SELF,
    effects: [
      { kind: 'block', min: 8, max: 8 },
      { kind: 'status', status: 'thorns', turns: 2, value: 3 },
    ],
    scaling: {},
    requirements: { endurance: 6 },
  }),
  guardian: skill({
    id: 'guardian',
    name: 'Guardian',
    description: 'Shield the whole party: Dodge for every ally.',
    focusCost: 3,
    manaCost: 0,
    targeting: ALL_ALLIES,
    effects: [{ kind: 'block', min: 6, max: 7 }],
    scaling: { endurance: 1 },
    requirements: { endurance: 7 },
  }),
  last_stand: skill({
    id: 'last_stand',
    name: 'Last Stand',
    description: 'Refuse to fall: heal yourself a lot.',
    focusCost: 2,
    manaCost: 0,
    targeting: SELF,
    effects: [{ kind: 'heal', min: 12, max: 15 }],
    scaling: { endurance: 1 },
    requirements: { endurance: 8 },
  }),

  // ---------------------------------------------------------------- Intellect
  lightning_bolt: skill({
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    description: 'A bolt of lightning at any enemy.',
    focusCost: 2,
    manaCost: 4,
    targeting: ANY_ENEMY,
    effects: [{ kind: 'damage', damageType: 'magic', min: 9, max: 12 }],
    scaling: { intellect: 1 },
    requirements: { intellect: 6 },
  }),
  ignite: skill({
    id: 'ignite',
    name: 'Ignite',
    description: 'Set any enemy ablaze: Burn 4 for 3 rounds.',
    focusCost: 1,
    manaCost: 3,
    targeting: ANY_ENEMY,
    effects: [{ kind: 'status', status: 'burn', turns: 3, value: 4 }],
    scaling: { intellect: 1 },
    requirements: { intellect: 6 },
  }),
  frost_nova: skill({
    id: 'frost_nova',
    name: 'Frost Nova',
    description: 'A wave of frost: hits every enemy and Weakens them.',
    focusCost: 3,
    manaCost: 5,
    targeting: ALL_ENEMIES,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 4, max: 5 },
      { kind: 'status', status: 'weaken', turns: 1 },
    ],
    scaling: { intellect: 1 },
    requirements: { intellect: 7 },
  }),
  mana_shield: skill({
    id: 'mana_shield',
    name: 'Mana Shield',
    description: 'Turn mana into a barrier: Dodge.',
    focusCost: 1,
    manaCost: 3,
    targeting: SELF,
    effects: [{ kind: 'block', min: 10, max: 10 }],
    scaling: {},
    requirements: { intellect: 7 },
  }),
  chain_lightning: skill({
    id: 'chain_lightning',
    name: 'Chain Lightning',
    description: 'Lightning that jumps through every enemy.',
    focusCost: 3,
    manaCost: 7,
    targeting: ALL_ENEMIES,
    effects: [{ kind: 'damage', damageType: 'magic', min: 6, max: 8 }],
    scaling: { intellect: 1 },
    requirements: { intellect: 9 },
  }),

  // ---------------------------------------------------------------- Will
  heal: skill({
    id: 'heal',
    name: 'Heal',
    description: 'Mend an ally’s wounds.',
    focusCost: 2,
    manaCost: 4,
    targeting: ALLY,
    effects: [{ kind: 'heal', min: 10, max: 13 }],
    scaling: { will: 1 },
    requirements: { will: 6 },
  }),
  regeneration: skill({
    id: 'regeneration',
    name: 'Regeneration',
    description: 'An ally regains 4 health at the start of each round, for 3 rounds.',
    focusCost: 1,
    manaCost: 3,
    targeting: ALLY,
    effects: [{ kind: 'status', status: 'regen', turns: 3, value: 4 }],
    scaling: { will: 1 },
    requirements: { will: 7 },
  }),
  purify: skill({
    id: 'purify',
    name: 'Purify',
    description: 'Remove every harmful status from an ally and heal them a little.',
    focusCost: 1,
    manaCost: 2,
    targeting: ALLY,
    effects: [{ kind: 'cleanse' }, { kind: 'heal', min: 3, max: 4 }],
    scaling: { will: 1 },
    requirements: { will: 6 },
  }),
  blessing_of_might: skill({
    id: 'blessing_of_might',
    name: 'Blessing of Might',
    description: 'An ally gains +3 Strength for 3 rounds.',
    focusCost: 1,
    manaCost: 2,
    targeting: ALLY,
    effects: [{ kind: 'status', status: 'strength', turns: 3, value: 3 }],
    scaling: {},
    requirements: { will: 6 },
  }),
  holy_light: skill({
    id: 'holy_light',
    name: 'Holy Light',
    description: 'A beam of holy light at any enemy.',
    focusCost: 2,
    manaCost: 3,
    targeting: ANY_ENEMY,
    effects: [{ kind: 'damage', damageType: 'magic', min: 8, max: 10 }],
    scaling: { will: 1 },
    requirements: { will: 7 },
  }),
  mass_heal: skill({
    id: 'mass_heal',
    name: 'Mass Heal',
    description: 'Heal the whole party.',
    focusCost: 3,
    manaCost: 7,
    targeting: ALL_ALLIES,
    effects: [{ kind: 'heal', min: 6, max: 8 }],
    scaling: { will: 1 },
    requirements: { will: 9 },
  }),

  // ---------------------------------------------------------------- two attributes
  venom_strike: skill({
    id: 'venom_strike',
    name: 'Venom Strike',
    description: 'A poisoned cut at the nearest enemy: Bleed 4 for 3 rounds.',
    focusCost: 2,
    manaCost: 0,
    targeting: NEAREST,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 4, max: 5 },
      { kind: 'status', status: 'bleed', turns: 3, value: 4 },
    ],
    scaling: { agility: 0.5, intellect: 0.5 },
    requirements: { agility: 6, intellect: 6 },
  }),
  thunder_strike: skill({
    id: 'thunder_strike',
    name: 'Thunder Strike',
    description: 'A blow charged with lightning: magic damage and Stun.',
    focusCost: 3,
    manaCost: 3,
    targeting: NEAREST,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 9, max: 11 },
      { kind: 'status', status: 'stun', turns: 1 },
    ],
    scaling: { might: 0.5, intellect: 0.5 },
    requirements: { might: 7, intellect: 6 },
  }),
  judgement: skill({
    id: 'judgement',
    name: 'Judgement',
    description: 'A holy blow at the nearest enemy that Weakens it.',
    focusCost: 2,
    manaCost: 2,
    targeting: NEAREST,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 8, max: 10 },
      { kind: 'status', status: 'weaken', turns: 2 },
    ],
    scaling: { might: 0.5, will: 0.5 },
    requirements: { might: 6, will: 6 },
  }),
  sniper_focus: skill({
    id: 'sniper_focus',
    name: 'Sniper’s Focus',
    description: 'Steady your aim: +3 Strength and Dodge for 2 rounds.',
    focusCost: 1,
    manaCost: 0,
    targeting: SELF,
    effects: [
      { kind: 'status', status: 'strength', turns: 2, value: 3 },
      { kind: 'block', min: 5, max: 5 },
    ],
    scaling: {},
    requirements: { precision: 6, agility: 6 },
  }),
  sanctuary: skill({
    id: 'sanctuary',
    name: 'Sanctuary',
    description: 'Holy ground: Dodge and Regeneration for every ally.',
    focusCost: 3,
    manaCost: 6,
    targeting: ALL_ALLIES,
    effects: [
      { kind: 'block', min: 4, max: 5 },
      { kind: 'status', status: 'regen', turns: 2, value: 3 },
    ],
    scaling: { will: 0.5, endurance: 0.5 },
    requirements: { will: 7, endurance: 6 },
  }),
} satisfies Record<string, SkillDef>;

export type SkillId = keyof typeof SKILLS;

export function getSkill(id: string): SkillDef | undefined {
  return Object.hasOwn(SKILLS, id) ? (SKILLS as Record<string, SkillDef>)[id] : undefined;
}

/**
 * Skill levels (request #50): reading the book of a skill you already know
 * raises its level; each level above 1 makes its numbers stronger.
 * PROVISIONAL (A110).
 */
export const SKILL_RULES = { maxLevel: 5, perLevel: 0.1 } as const;

/** Multiplier for a skill's damage, healing, Dodge and status values at a level. */
export const skillLevelMultiplier = (level: number) =>
  1 + SKILL_RULES.perLevel * (Math.max(1, Math.min(SKILL_RULES.maxLevel, level)) - 1);

/** Item id of the Skill Book that teaches a skill. */
export const skillBookId = (skillId: string) => `book_${skillId}`;
