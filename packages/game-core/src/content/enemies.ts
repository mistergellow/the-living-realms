import type { EnemyFamily, StatusId } from '@realms/shared';
import type { AbilityId } from './abilities.js';
import type { ChampionAffixId } from './champions.js';

/*
 * Enemy definitions (data). PROVISIONAL CONTENT: neutral placeholder names
 * and numbers, tuned by simulation. `power` multiplies all ability values.
 */

export interface EnemyDef {
  id: string;
  name: string;
  /** Request #67 (D123): for "strong against {family}" gear bonuses. */
  family: EnemyFamily;
  maxHp: number;
  armor: number;
  magicResist: number;
  /** Agility-like value added to the initiative roll. */
  initiative: number;
  /** Precision: Focus per round, same rule as players (default 5 → 3 Focus). */
  precision?: number;
  critChance: number;
  power: number;
  abilities: AbilityId[];
  isBoss?: boolean;
  /** Statuses it starts every fight with (e.g. Thorns), request #44. */
  startStatuses?: Array<{ id: StatusId; value: number }>;
  /** One line on its mechanic, shown to players (request #44). */
  mechanic?: string;
  /** Request #71: a mini-boss (leads Elite rooms; never a Champion, has phases). */
  isMiniBoss?: boolean;
  /**
   * Request #71: phases. When its health falls to `atHpPct` % or lower, the
   * enemy changes once: new abilities, new statuses, help called in.
   */
  phases?: EnemyPhase[];
  /** Request #71: the Rift theme it belongs to (art tint, encyclopedia). */
  theme?: string;
  /** Request #71: traits it always has (same effects as Champion affixes, not shown as such). */
  innate?: ChampionAffixId[];
}

export interface EnemyPhase {
  atHpPct: number;
  /** Shown in the log and over the fight ("The seal cracks!"). */
  text: string;
  /** Replaces its abilities. */
  abilities?: AbilityId[];
  /** Added on the spot (turns default to the rest of the fight). */
  statuses?: Array<{ id: StatusId; value: number; turns?: number }>;
  /** Called into free positions. */
  summon?: string[];
  /** Heals this % of its maximum health. */
  healPct?: number;
}

const enemy = (e: EnemyDef) => e;

export const ENEMIES = {
  rift_husk: enemy({
    id: 'rift_husk',
    name: 'Rift Husk',
    family: 'hollow',
    maxHp: 30,
    armor: 8,
    magicResist: 0,
    initiative: 3,
    critChance: 5,
    power: 1.15,
    abilities: ['husk_claw'],
  }),
  shard_spitter: enemy({
    id: 'shard_spitter',
    name: 'Shard Spitter',
    family: 'void',
    maxHp: 20,
    armor: 0,
    magicResist: 10,
    initiative: 7,
    critChance: 5,
    power: 1.15,
    abilities: ['spit_shard'],
  }),
  hollow_hound: enemy({
    id: 'hollow_hound',
    name: 'Hollow Hound',
    family: 'beast',
    maxHp: 26,
    armor: 4,
    magicResist: 4,
    initiative: 9,
    critChance: 10,
    power: 1.1,
    abilities: ['hound_lunge'],
  }),
  rift_bulwark: enemy({
    id: 'rift_bulwark',
    name: 'Rift Bulwark',
    family: 'construct',
    maxHp: 30,
    armor: 20,
    magicResist: 5,
    initiative: 1,
    critChance: 0,
    power: 1,
    abilities: ['bulwark_wall', 'bulwark_bash'],
  }),
  rift_warden: enemy({
    id: 'rift_warden',
    name: 'Rift Warden',
    family: 'construct',
    maxHp: 130,
    armor: 10,
    magicResist: 15,
    initiative: 5,
    critChance: 5,
    power: 1.2,
    precision: 7,
    abilities: ['warden_slam', 'warden_pulse', 'warden_seal'],
    isBoss: true,
    mechanic: 'At 60% the seal cracks and husks pour out; at 30% it burns with rift-fire.',
    phases: [
      { atHpPct: 60, text: 'The seal cracks: husks pour out!', summon: ['rift_husk'] },
      {
        atHpPct: 30,
        text: 'The Warden burns with rift-fire!',
        abilities: ['warden_slam', 'warden_pulse', 'warden_quake'],
        statuses: [{ id: 'strength', value: 3 }],
      },
    ],
  }),

  // ---- request #71: Rift themes (PROVISIONAL numbers, tuned by `pnpm sim`) ----
  // The Hollow Breach
  grave_crawler: enemy({
    id: 'grave_crawler',
    name: 'Grave Crawler',
    family: 'hollow',
    theme: 'hollow',
    maxHp: 16,
    armor: 0,
    magicResist: 0,
    initiative: 8,
    critChance: 10,
    power: 0.9,
    abilities: ['crawler_rake', 'husk_claw'],
    mechanic: 'Goes for whoever stands at the back; claws the front only when nobody is there.',
  }),
  bone_archer: enemy({
    id: 'bone_archer',
    name: 'Bone Archer',
    family: 'hollow',
    theme: 'hollow',
    maxHp: 16,
    armor: 4,
    magicResist: 0,
    initiative: 6,
    critChance: 10,
    power: 0.85,
    abilities: ['bone_volley'],
    mechanic: 'Marks its target: everyone hits it harder.',
  }),
  husk_abomination: enemy({
    id: 'husk_abomination',
    name: 'Husk Abomination',
    family: 'hollow',
    theme: 'hollow',
    maxHp: 70,
    armor: 12,
    magicResist: 0,
    initiative: 2,
    precision: 7,
    critChance: 5,
    power: 1.1,
    abilities: ['abom_taunt', 'abom_crush'],
    isMiniBoss: true,
    mechanic: 'Taunts: you must strike it first. At half health it goes berserk.',
    phases: [
      {
        atHpPct: 50,
        text: 'The Abomination goes berserk!',
        statuses: [{ id: 'strength', value: 3 }],
      },
    ],
  }),
  // The Crystal Nest
  prism_sentinel: enemy({
    id: 'prism_sentinel',
    name: 'Prism Sentinel',
    family: 'void',
    theme: 'crystal',
    maxHp: 24,
    armor: 6,
    magicResist: 30,
    initiative: 4,
    critChance: 5,
    power: 1,
    abilities: ['prism_beam'],
    innate: ['mirrored'],
    mechanic: 'Mirrored: 35% chance to send a melee hit back. Shrugs off magic.',
  }),
  geode_crusher: enemy({
    id: 'geode_crusher',
    name: 'Geode Crusher',
    family: 'beast',
    theme: 'crystal',
    maxHp: 30,
    armor: 14,
    magicResist: 0,
    initiative: 2,
    critChance: 5,
    power: 1,
    abilities: ['geode_shatter'],
    mechanic: 'Breaks guards: double damage against Dodge. Its Chill steals Focus.',
  }),
  geode_titan: enemy({
    id: 'geode_titan',
    name: 'Geode Titan',
    family: 'beast',
    theme: 'crystal',
    maxHp: 80,
    armor: 20,
    magicResist: 5,
    initiative: 1,
    precision: 7,
    critChance: 5,
    power: 1.05,
    abilities: ['titan_guard', 'titan_quake'],
    isMiniBoss: true,
    mechanic: 'Taunts and hardens. At half health it grows thorns and calls a Sentinel.',
    phases: [
      {
        atHpPct: 50,
        text: 'The Titan cracks open: thorns of crystal!',
        statuses: [{ id: 'thorns', value: 4 }],
        summon: ['prism_sentinel'],
      },
    ],
  }),
  crystal_matriarch: enemy({
    id: 'crystal_matriarch',
    name: 'The Crystal Matriarch',
    family: 'beast',
    theme: 'crystal',
    maxHp: 150,
    armor: 10,
    magicResist: 15,
    initiative: 3,
    precision: 7,
    critChance: 5,
    power: 1.15,
    abilities: ['shard_storm', 'crystallize', 'matriarch_call'],
    isBoss: true,
    mechanic: 'Calls mites, encases heroes in crystal. Near death she shatters into fury.',
    phases: [
      {
        atHpPct: 60,
        text: 'The Matriarch shrieks: the brood answers!',
        summon: ['volatile_mite', 'volatile_mite'],
      },
      {
        atHpPct: 25,
        text: 'The Matriarch shatters into fury!',
        abilities: ['shard_storm', 'crystal_rend'],
        statuses: [{ id: 'strength', value: 4 }],
      },
    ],
  }),
  // The Crimson Cult
  cult_assassin: enemy({
    id: 'cult_assassin',
    name: 'Cult Assassin',
    family: 'humanoid',
    theme: 'cult',
    maxHp: 20,
    armor: 2,
    magicResist: 5,
    initiative: 10,
    critChance: 15,
    power: 1.05,
    abilities: ['assassin_stab', 'assassin_veil'],
    mechanic: 'Strikes your back line, then hides (Intangible). Protect your casters.',
  }),
  flagellant: enemy({
    id: 'flagellant',
    name: 'Flagellant',
    family: 'humanoid',
    theme: 'cult',
    maxHp: 28,
    armor: 4,
    magicResist: 4,
    initiative: 4,
    critChance: 5,
    power: 1,
    abilities: ['flagellant_zeal', 'flagellant_scourge'],
    innate: ['thorned'],
    mechanic: 'Thorned, and grows stronger every round once its rite begins.',
  }),
  blood_priest: enemy({
    id: 'blood_priest',
    name: 'Blood Priest',
    family: 'humanoid',
    theme: 'cult',
    maxHp: 20,
    armor: 0,
    magicResist: 10,
    initiative: 5,
    critChance: 5,
    power: 1,
    abilities: ['priest_rite', 'priest_curse'],
    mechanic: 'Heals all its allies and weakens you. Kill it first.',
  }),
  cult_fanatic: enemy({
    id: 'cult_fanatic',
    name: 'Fanatic',
    family: 'humanoid',
    theme: 'cult',
    maxHp: 22,
    armor: 4,
    magicResist: 0,
    initiative: 6,
    critChance: 10,
    power: 1.05,
    abilities: ['fanatic_charge'],
  }),
  high_inquisitor: enemy({
    id: 'high_inquisitor',
    name: 'High Inquisitor',
    family: 'humanoid',
    theme: 'cult',
    maxHp: 75,
    armor: 10,
    magicResist: 10,
    initiative: 6,
    precision: 7,
    critChance: 10,
    power: 1.1,
    abilities: ['inquisitor_brand', 'inquisitor_verdict'],
    isMiniBoss: true,
    mechanic: 'Brands and stuns; punishes Dodge. At half health calls fanatics.',
    phases: [
      {
        atHpPct: 50,
        text: 'The Inquisitor calls the faithful!',
        summon: ['cult_fanatic', 'cult_fanatic'],
      },
    ],
  }),
  bleeding_saint: enemy({
    id: 'bleeding_saint',
    name: 'The Bleeding Saint',
    family: 'humanoid',
    theme: 'cult',
    maxHp: 150,
    armor: 8,
    magicResist: 15,
    initiative: 5,
    precision: 7,
    critChance: 10,
    power: 1.15,
    abilities: ['saint_rain', 'saint_sacrament'],
    isBoss: true,
    mechanic: 'Bleeds everyone and drinks it back. Calls zealots at half health, then heals once.',
    phases: [
      {
        atHpPct: 50,
        text: 'The Saint opens her wounds: zealots rise!',
        summon: ['rift_zealot', 'rift_zealot'],
        statuses: [{ id: 'ritual', value: 1 }],
      },
      { atHpPct: 20, text: 'A last sacrament: the Saint heals.', healPct: 25 },
    ],
  }),
  // The Drowned Depths
  drowned_thrall: enemy({
    id: 'drowned_thrall',
    name: 'Drowned Thrall',
    family: 'hollow',
    theme: 'drowned',
    maxHp: 32,
    armor: 8,
    magicResist: 4,
    initiative: 2,
    critChance: 5,
    power: 1.05,
    abilities: ['thrall_wall', 'thrall_grasp'],
    mechanic: 'Taunts, and its cold grasp Chills: less Focus next round.',
  }),
  tide_lurker: enemy({
    id: 'tide_lurker',
    name: 'Tide Lurker',
    family: 'beast',
    theme: 'drowned',
    maxHp: 24,
    armor: 4,
    magicResist: 0,
    initiative: 8,
    critChance: 10,
    power: 1.05,
    abilities: ['lurker_undertow'],
    mechanic: 'Drags your back line under: Chill and Bleed.',
  }),
  drowned_siren: enemy({
    id: 'drowned_siren',
    name: 'Siren',
    family: 'void',
    theme: 'drowned',
    maxHp: 20,
    armor: 0,
    magicResist: 15,
    initiative: 6,
    critChance: 5,
    power: 1,
    abilities: ['siren_song', 'siren_wail'],
    mechanic: 'Her song Weakens and Blinds your whole party.',
  }),
  drowned_knight: enemy({
    id: 'drowned_knight',
    name: 'The Drowned Knight',
    family: 'hollow',
    theme: 'drowned',
    maxHp: 85,
    armor: 16,
    magicResist: 8,
    initiative: 4,
    precision: 7,
    critChance: 10,
    power: 1.1,
    abilities: ['thrall_wall', 'knight_tide'],
    isMiniBoss: true,
    innate: ['regenerating'],
    mechanic: 'Taunts, regenerates and breaks guards. At half health the tide rises.',
    phases: [
      {
        atHpPct: 50,
        text: 'The tide rises around the Knight!',
        summon: ['drowned_thrall'],
        statuses: [{ id: 'strength', value: 2 }],
      },
    ],
  }),
  leviathan_maw: enemy({
    id: 'leviathan_maw',
    name: 'The Leviathan Maw',
    family: 'beast',
    theme: 'drowned',
    maxHp: 170,
    armor: 12,
    magicResist: 10,
    initiative: 3,
    precision: 7,
    critChance: 10,
    power: 1.2,
    abilities: ['maw_crush', 'maw_wave', 'maw_swallow'],
    isBoss: true,
    mechanic: 'Swallows heroes whole and floods the room. Calls thralls, then thrashes.',
    phases: [
      {
        atHpPct: 50,
        text: 'The Maw sinks: thralls rise from the water!',
        summon: ['drowned_thrall', 'drowned_thrall'],
      },
      {
        atHpPct: 25,
        text: 'The Leviathan thrashes in agony!',
        statuses: [
          { id: 'strength', value: 4 },
          { id: 'regen', value: 6 },
        ],
      },
    ],
  }),
  // The Rift Heart
  void_horror: enemy({
    id: 'void_horror',
    name: 'Void Horror',
    family: 'void',
    theme: 'heart',
    maxHp: 30,
    armor: 0,
    magicResist: 20,
    initiative: 5,
    critChance: 5,
    power: 1.1,
    abilities: ['horror_gaze', 'stalker_phase'],
    mechanic: 'Marks your whole party, then slips out of reach (Intangible).',
  }),
  rift_knight: enemy({
    id: 'rift_knight',
    name: 'Rift Knight',
    family: 'humanoid',
    theme: 'heart',
    maxHp: 40,
    armor: 18,
    magicResist: 8,
    initiative: 4,
    critChance: 10,
    power: 1.1,
    abilities: ['knight_stand', 'knight_rend'],
    mechanic: 'Taunts, and triple damage against Dodge. Do not hide behind Dodge.',
  }),
  unmaker: enemy({
    id: 'unmaker',
    name: 'Unmaker',
    family: 'void',
    theme: 'heart',
    maxHp: 22,
    armor: 0,
    magicResist: 15,
    initiative: 7,
    critChance: 5,
    power: 1.05,
    abilities: ['unmaker_drain'],
    mechanic: 'Pulls the Focus out of you (Chill 2).',
  }),
  void_herald: enemy({
    id: 'void_herald',
    name: 'Void Herald',
    family: 'void',
    theme: 'heart',
    maxHp: 80,
    armor: 10,
    magicResist: 20,
    initiative: 6,
    precision: 7,
    critChance: 10,
    power: 1.1,
    abilities: ['herald_command', 'herald_call', 'stalker_strike'],
    isMiniBoss: true,
    mechanic: 'Commands its allies (+Strength) and calls Stalkers. Goes Intangible when hurt.',
    phases: [
      {
        atHpPct: 50,
        text: 'The Herald fades between worlds!',
        statuses: [{ id: 'intangible', value: 0, turns: 2 }],
        healPct: 15,
      },
    ],
  }),
  rift_heart: enemy({
    id: 'rift_heart',
    name: 'The Rift Heart',
    family: 'void',
    theme: 'heart',
    maxHp: 200,
    armor: 10,
    magicResist: 20,
    initiative: 5,
    precision: 7,
    critChance: 10,
    power: 1.25,
    abilities: ['heart_pulse', 'heart_tendril'],
    isBoss: true,
    mechanic: 'Three phases: it beats, then calls the Rift, then collapses reality.',
    phases: [
      {
        atHpPct: 66,
        text: 'The Heart calls the Rift to its defence!',
        summon: ['void_horror', 'rift_knight'],
      },
      {
        atHpPct: 33,
        text: 'Reality folds around the Heart!',
        abilities: ['heart_pulse', 'heart_tendril', 'heart_collapse'],
        statuses: [{ id: 'strength', value: 4 }],
      },
    ],
  }),
  // ---- request #44: enemies with their own mechanics (PROVISIONAL numbers) ----
  rift_leech: enemy({
    id: 'rift_leech',
    name: 'Rift Leech',
    family: 'beast',
    maxHp: 26,
    armor: 4,
    magicResist: 4,
    initiative: 5,
    critChance: 5,
    power: 1.15,
    abilities: ['leech_drain'],
    mechanic: 'Heals itself for the damage it deals.',
  }),
  thornback: enemy({
    id: 'thornback',
    name: 'Thornback',
    family: 'beast',
    maxHp: 30,
    armor: 12,
    magicResist: 0,
    initiative: 2,
    critChance: 0,
    power: 1.15,
    abilities: ['thorn_lash'],
    startStatuses: [{ id: 'thorns', value: 3 }],
    mechanic: 'Thorns: whoever hits it takes 3 damage back. Use spells or ranged hits wisely.',
  }),
  void_shaman: enemy({
    id: 'void_shaman',
    name: 'Void Shaman',
    family: 'void',
    maxHp: 20,
    armor: 0,
    magicResist: 12,
    initiative: 6,
    critChance: 0,
    power: 1,
    abilities: ['shaman_empower', 'shaman_mend'],
    mechanic: 'Gives its allies Strength and heals them. Kill it first.',
  }),
  brood_mother: enemy({
    id: 'brood_mother',
    name: 'Brood Mother',
    family: 'brood',
    maxHp: 40,
    armor: 6,
    magicResist: 6,
    initiative: 2,
    critChance: 0,
    power: 1,
    abilities: ['brood_spawn', 'brood_slam'],
    mechanic: 'Calls Volatile Mites into the fight.',
  }),
  volatile_mite: enemy({
    id: 'volatile_mite',
    name: 'Volatile Mite',
    family: 'brood',
    maxHp: 9,
    armor: 0,
    magicResist: 0,
    initiative: 8,
    critChance: 0,
    power: 1,
    precision: 3,
    abilities: ['mite_fuse'],
    mechanic: 'Lights a fuse and explodes 2 rounds later, hurting your whole party.',
  }),
  phase_stalker: enemy({
    id: 'phase_stalker',
    name: 'Phase Stalker',
    family: 'void',
    maxHp: 26,
    armor: 4,
    magicResist: 4,
    initiative: 9,
    critChance: 10,
    power: 1,
    abilities: ['stalker_phase', 'stalker_strike'],
    mechanic: 'Turns Intangible (every hit deals 1) on some rounds: strike when it is solid.',
  }),
  rift_zealot: enemy({
    id: 'rift_zealot',
    name: 'Rift Zealot',
    family: 'humanoid',
    maxHp: 26,
    armor: 2,
    magicResist: 8,
    initiative: 4,
    critChance: 0,
    power: 1,
    abilities: ['zealot_ritual', 'zealot_strike'],
    mechanic: 'Its ritual makes it stronger every round. End it fast.',
  }),
  /**
   * World boss, season 1 (request #43). Its real HP is the shared pool in the
   * database; maxHp here is only the base the pool is scaled from.
   * PLACEHOLDER: name, theme, numbers.
   */
  hollow_colossus: enemy({
    id: 'hollow_colossus',
    name: 'The Hollow Colossus',
    family: 'hollow',
    maxHp: 1000,
    armor: 30,
    magicResist: 30,
    initiative: 6,
    critChance: 10,
    power: 3,
    precision: 9,
    abilities: ['warden_slam', 'warden_pulse', 'warden_seal'],
    isBoss: true,
  }),
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;

/**
 * Elite Rooms (request #31): the same enemies, significantly stronger.
 * PROVISIONAL multipliers.
 */
export const ELITE_RULES = {
  namePrefix: 'Elite',
  hpMultiplier: 1.75,
  powerMultiplier: 1.4,
  /** Extra Precision (more Focus per round). */
  precisionBonus: 2,
} as const;

export function getEnemy(id: string): EnemyDef | undefined {
  return (ENEMIES as Record<string, EnemyDef>)[id];
}
