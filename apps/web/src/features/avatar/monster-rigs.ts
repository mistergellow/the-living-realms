import { BONES as HERO_BONES, type BoneDef, type Pt } from './bone-rig';

/*
 * Request #91: the monsters as bones too, until their art exists. A few BODY
 * PLANS (skeletons) cover the 36 monsters; each monster uses one, maybe
 * scaled. Every bone has its own colour; the artist draws one picture per
 * bone of each monster (`avatar/monsters/<monster>/_bone_<bone>.png`).
 *
 * Plans are drawn facing RIGHT like the hero (same 120×160 space, feet at
 * y ≈ 150); monsters are mirrored to face LEFT when shown.
 */
export type BodyPlan = 'humanoid' | 'brute' | 'quadruped' | 'crawler' | 'spider' | 'floater';

export const BODY_PLAN_NAMES: Record<BodyPlan, string> = {
  humanoid: 'Humanoid',
  brute: 'Brute (big humanoid)',
  quadruped: 'Quadruped (four legs)',
  crawler: 'Crawler (worm, leech, mite)',
  spider: 'Spider (many legs)',
  floater: 'Floater (no legs, tentacles)',
};

// A palette of distinct colours, reused across the plans in bone order.
const PALETTE = [
  '#e6194b',
  '#f58231',
  '#ffe119',
  '#bfef45',
  '#3cb44b',
  '#42d4f4',
  '#4363d8',
  '#911eb4',
  '#f032e6',
  '#a9a9a9',
  '#800000',
  '#aaffc3',
  '#808000',
  '#469990',
  '#dcbeff',
  '#9a6324',
  '#000075',
  '#fabed4',
  '#ffd8b1',
  '#fffac8',
] as const;

type Spec = [id: string, label: string, from: Pt, to: Pt, width: number, shape?: BoneDef['shape']];

/** Bones of a plan from compact specs, coloured in order (all on one layer). */
function plan(specs: Spec[]): BoneDef[] {
  return specs.map(([id, label, from, to, width, shape = 'capsule'], i) => ({
    id,
    label,
    color: PALETTE[i % PALETTE.length]!,
    from,
    to,
    width,
    shape,
    layer: 'base',
  }));
}

const p = (x: number, y: number): Pt => ({ x, y });

/** Back to front, per plan. */
export const BODY_PLANS: Record<BodyPlan, readonly BoneDef[]> = {
  // Same skeleton and stance as the hero (Darkest Dungeon three-quarter view).
  humanoid: HERO_BONES,
  // A bigger, heavier humanoid (drawn scaled up, see ENEMY_RIGS).
  brute: HERO_BONES.map((b) => ({ ...b, width: Math.round(b.width * 1.35) })),
  quadruped: plan([
    ['hind_leg_upper_far', 'Hind leg, upper (far)', p(44, 108), p(36, 128), 9],
    ['hind_leg_lower_far', 'Hind leg, lower (far)', p(36, 128), p(42, 148), 6],
    ['front_leg_upper_far', 'Front leg, upper (far)', p(76, 110), p(80, 128), 8],
    ['front_leg_lower_far', 'Front leg, lower (far)', p(80, 128), p(78, 148), 6],
    ['tail', 'Tail', p(36, 100), p(14, 88), 5],
    ['back', 'Back / belly', p(58, 104), p(36, 102), 24, 'oval'],
    ['chest', 'Chest / shoulders', p(80, 104), p(58, 104), 28, 'oval'],
    ['neck', 'Neck', p(82, 98), p(92, 88), 11],
    ['head', 'Head / jaws', p(92, 88), p(112, 96), 16, 'oval'],
    ['hind_leg_upper_near', 'Hind leg, upper (near)', p(40, 110), p(30, 130), 10],
    ['hind_leg_lower_near', 'Hind leg, lower (near)', p(30, 130), p(36, 148), 7],
    ['front_leg_upper_near', 'Front leg, upper (near)', p(72, 112), p(68, 130), 9],
    ['front_leg_lower_near', 'Front leg, lower (near)', p(68, 130), p(72, 148), 7],
  ]),
  crawler: plan([
    ['tail', 'Tail', p(14, 142), p(28, 140), 10],
    ['segment_3', 'Body segment 3', p(28, 140), p(46, 136), 16, 'oval'],
    ['segment_2', 'Body segment 2', p(46, 136), p(64, 133), 20, 'oval'],
    ['segment_1', 'Body segment 1', p(64, 133), p(82, 134), 24, 'oval'],
    ['head', 'Head / mouth', p(82, 134), p(100, 138), 22, 'oval'],
    ['mandible', 'Mandible / fang', p(98, 142), p(108, 148), 4],
  ]),
  spider: plan([
    ['leg_far_1_upper', 'Leg far 1, upper', p(62, 104), p(52, 80), 5],
    ['leg_far_1_lower', 'Leg far 1, lower', p(52, 80), p(40, 146), 4],
    ['leg_far_2_upper', 'Leg far 2, upper', p(68, 104), p(78, 78), 5],
    ['leg_far_2_lower', 'Leg far 2, lower', p(78, 78), p(90, 146), 4],
    ['leg_far_3_upper', 'Leg far 3, upper', p(74, 106), p(98, 84), 5],
    ['leg_far_3_lower', 'Leg far 3, lower', p(98, 84), p(112, 146), 4],
    ['abdomen', 'Abdomen', p(56, 108), p(22, 104), 38, 'oval'],
    ['thorax', 'Thorax', p(74, 110), p(56, 108), 24, 'oval'],
    ['head', 'Head', p(74, 110), p(88, 114), 15, 'oval'],
    ['leg_near_1_upper', 'Leg near 1, upper', p(60, 112), p(44, 90), 6],
    ['leg_near_1_lower', 'Leg near 1, lower', p(44, 90), p(28, 148), 5],
    ['leg_near_2_upper', 'Leg near 2, upper', p(66, 114), p(70, 88), 6],
    ['leg_near_2_lower', 'Leg near 2, lower', p(70, 88), p(80, 148), 5],
    ['leg_near_3_upper', 'Leg near 3, upper', p(72, 114), p(92, 92), 6],
    ['leg_near_3_lower', 'Leg near 3, lower', p(92, 92), p(104, 148), 5],
  ]),
  floater: plan([
    ['tentacle_far_1_upper', 'Tentacle far 1, upper', p(70, 106), p(78, 126), 7],
    ['tentacle_far_1_lower', 'Tentacle far 1, lower', p(78, 126), p(74, 144), 5],
    ['tentacle_far_2_upper', 'Tentacle far 2, upper', p(50, 106), p(40, 126), 7],
    ['tentacle_far_2_lower', 'Tentacle far 2, lower', p(40, 126), p(46, 144), 5],
    ['core', 'Body / core', p(58, 62), p(60, 110), 46, 'oval'],
    ['maw', 'Maw / face', p(66, 66), p(84, 74), 22, 'oval'],
    ['tentacle_near_1_upper', 'Tentacle near 1, upper', p(62, 110), p(62, 130), 8],
    ['tentacle_near_1_lower', 'Tentacle near 1, lower', p(62, 130), p(68, 148), 6],
    ['tentacle_near_2_upper', 'Tentacle near 2, upper', p(48, 108), p(50, 128), 8],
    ['tentacle_near_2_lower', 'Tentacle near 2, lower', p(50, 128), p(42, 146), 6],
  ]),
};

/** Which body plan each monster uses, and how big it is drawn (1 = hero size). */
export const ENEMY_RIGS: Record<string, { plan: BodyPlan; scale?: number }> = {
  // humanoids
  rift_husk: { plan: 'humanoid' },
  rift_warden: { plan: 'humanoid', scale: 1.08 },
  rift_bulwark: { plan: 'humanoid', scale: 1.05 },
  void_shaman: { plan: 'humanoid' },
  phase_stalker: { plan: 'humanoid' },
  rift_zealot: { plan: 'humanoid' },
  bone_archer: { plan: 'humanoid' },
  prism_sentinel: { plan: 'humanoid' },
  cult_assassin: { plan: 'humanoid', scale: 0.95 },
  flagellant: { plan: 'humanoid' },
  blood_priest: { plan: 'humanoid' },
  cult_fanatic: { plan: 'humanoid' },
  high_inquisitor: { plan: 'humanoid', scale: 1.05 },
  bleeding_saint: { plan: 'humanoid', scale: 1.1 },
  drowned_thrall: { plan: 'humanoid' },
  drowned_siren: { plan: 'humanoid' },
  drowned_knight: { plan: 'humanoid', scale: 1.05 },
  rift_knight: { plan: 'humanoid', scale: 1.05 },
  unmaker: { plan: 'humanoid', scale: 1.1 },
  void_herald: { plan: 'humanoid', scale: 1.1 },
  // brutes
  hollow_colossus: { plan: 'brute', scale: 1.15 },
  husk_abomination: { plan: 'brute', scale: 1.12 },
  geode_crusher: { plan: 'brute', scale: 1.1 },
  geode_titan: { plan: 'brute', scale: 1.15 },
  // beasts
  hollow_hound: { plan: 'quadruped' },
  thornback: { plan: 'quadruped', scale: 1.1 },
  tide_lurker: { plan: 'quadruped', scale: 1.05 },
  // crawlers
  rift_leech: { plan: 'crawler' },
  grave_crawler: { plan: 'crawler' },
  shard_spitter: { plan: 'crawler', scale: 0.9 },
  volatile_mite: { plan: 'crawler', scale: 0.7 },
  // spiders
  brood_mother: { plan: 'spider', scale: 1.1 },
  crystal_matriarch: { plan: 'spider', scale: 1.15 },
  // floaters
  void_horror: { plan: 'floater' },
  leviathan_maw: { plan: 'floater', scale: 1.12 },
  rift_heart: { plan: 'floater', scale: 1.15 },
};

/** The rig of a monster (unknown or custom monsters: a humanoid). */
export function enemyRig(enemyDefId: string | null): {
  plan: BodyPlan;
  scale: number;
  bones: readonly BoneDef[];
} {
  const r = (enemyDefId && ENEMY_RIGS[enemyDefId]) || { plan: 'humanoid' as const };
  return { plan: r.plan, scale: r.scale ?? 1, bones: BODY_PLANS[r.plan] };
}
