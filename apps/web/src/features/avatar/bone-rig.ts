/*
 * Request #91: the hero as a skeleton of BONES, one colour each, while the
 * owner draws the art. Every bone is a part to be drawn later (one image per
 * bone, turning at its first joint). Data only — the SVG avatar
 * (`CharacterAvatar`) and the rig reference sheet (`scripts/art/hero-rig.ts`)
 * both read it.
 *
 * Space: the avatar viewBox, 0 0 120 160, facing right, feet at y ≈ 150.
 * The shoulder, neck and hand joints match `RIG` (the canvas animates the
 * layers around them).
 */

export interface Pt {
  x: number;
  y: number;
}

/** Which animated layer a bone belongs to (see `AvatarPart`). */
export type BoneLayer = 'offhand' | 'base' | 'weapon' | 'head';

export interface BoneDef {
  id: string;
  /** Name for the artist. */
  label: string;
  /** Distinct colour (a 16-colour palette that stays apart). */
  color: string;
  /** The joint it turns at, and where it ends (the next joint). */
  from: Pt;
  to: Pt;
  /** Thickness of the placeholder (viewBox units). */
  width: number;
  /** Placeholder shape: a rounded bar, or an oval (head, hands, torso). */
  shape: 'capsule' | 'oval';
  layer: BoneLayer;
}

/*
 * Request #91 (3rd pass): the Darkest Dungeon stance — three-quarter view
 * facing right with the chest turned to the viewer, about six heads tall, in
 * a fighting stance. Facing right, the hero's RIGHT side is the near one:
 *   - the RIGHT arm (near) is drawn IN FRONT of the body and holds the weapon;
 *   - the LEFT arm (far) reaches forward, towards the enemy, BEHIND the body
 *     (it holds the shield / off-hand);
 *   - the LEFT leg (far) steps forward, bent, BEHIND; the RIGHT leg (near)
 *     stretches back, IN FRONT.
 */
export const JOINTS = {
  crown: { x: 72, y: 25 },
  neck: { x: 69, y: 45 },
  neckBase: { x: 66, y: 52 },
  waist: { x: 60, y: 86 },
  hipCenter: { x: 58, y: 98 },
  // right arm (near, weapon)
  rightShoulder: { x: 61, y: 55 },
  rightElbow: { x: 56, y: 74 },
  rightWrist: { x: 67, y: 85 },
  rightHand: { x: 71.5, y: 86.5 },
  // left arm (far, off-hand)
  leftShoulder: { x: 72, y: 53 },
  leftElbow: { x: 83, y: 68 },
  leftWrist: { x: 93, y: 74 },
  leftFist: { x: 96.5, y: 75.5 },
  // left leg (far, stepping forward)
  leftHip: { x: 62, y: 96 },
  leftKnee: { x: 76, y: 118 },
  leftAnkle: { x: 73, y: 144 },
  leftToe: { x: 86, y: 148 },
  // right leg (near, stretched back)
  rightHip: { x: 55, y: 97 },
  rightKnee: { x: 44, y: 121 },
  rightAnkle: { x: 34, y: 144 },
  rightToe: { x: 45, y: 149 },
} as const satisfies Record<string, Pt>;

const J = JOINTS;

const bone = (
  id: string,
  label: string,
  color: string,
  from: Pt,
  to: Pt,
  width: number,
  shape: BoneDef['shape'],
  layer: BoneLayer,
): BoneDef => ({ id, label, color, from, to, width, shape, layer });

/** Back to front: the order they are drawn in. */
export const BONES: readonly BoneDef[] = [
  // left arm — far, behind the body (off-hand layer)
  bone(
    'upper_arm_left',
    'Upper arm (left, far)',
    '#911eb4',
    J.leftShoulder,
    J.leftElbow,
    8,
    'capsule',
    'offhand',
  ),
  bone(
    'forearm_left',
    'Forearm (left, far)',
    '#f032e6',
    J.leftElbow,
    J.leftWrist,
    7,
    'capsule',
    'offhand',
  ),
  bone('hand_left', 'Hand (left, far)', '#a9a9a9', J.leftWrist, J.leftFist, 8, 'oval', 'offhand'),
  // body: far leg, then pelvis and torso, then the near leg
  bone('thigh_left', 'Thigh (left, far)', '#800000', J.leftHip, J.leftKnee, 11, 'capsule', 'base'),
  bone('shin_left', 'Shin (left, far)', '#aaffc3', J.leftKnee, J.leftAnkle, 9, 'capsule', 'base'),
  bone('foot_left', 'Foot (left, far)', '#808000', J.leftAnkle, J.leftToe, 7, 'capsule', 'base'),
  bone('pelvis', 'Pelvis / hips', '#bfef45', J.waist, J.hipCenter, 20, 'oval', 'base'),
  bone('torso', 'Torso / chest', '#ffe119', J.neckBase, J.waist, 24, 'oval', 'base'),
  bone(
    'thigh_right',
    'Thigh (right, near)',
    '#469990',
    J.rightHip,
    J.rightKnee,
    11,
    'capsule',
    'base',
  ),
  bone(
    'shin_right',
    'Shin (right, near)',
    '#dcbeff',
    J.rightKnee,
    J.rightAnkle,
    9,
    'capsule',
    'base',
  ),
  bone(
    'foot_right',
    'Foot (right, near)',
    '#9a6324',
    J.rightAnkle,
    J.rightToe,
    7,
    'capsule',
    'base',
  ),
  // right arm — near, in front of the body, holds the weapon (weapon layer)
  bone(
    'upper_arm_right',
    'Upper arm (right, near)',
    '#3cb44b',
    J.rightShoulder,
    J.rightElbow,
    8,
    'capsule',
    'weapon',
  ),
  bone(
    'forearm_right',
    'Forearm (right, near)',
    '#42d4f4',
    J.rightElbow,
    J.rightWrist,
    7,
    'capsule',
    'weapon',
  ),
  bone(
    'hand_right',
    'Hand (right, near)',
    '#4363d8',
    J.rightWrist,
    J.rightHand,
    8,
    'oval',
    'weapon',
  ),
  // head
  bone('neck', 'Neck', '#f58231', J.neckBase, J.neck, 7, 'capsule', 'head'),
  bone('head', 'Head', '#e6194b', J.neck, J.crown, 16, 'oval', 'head'),
];

/** Length and angle (degrees, 0 = pointing right) of a bone. */
export function boneGeometry(b: BoneDef): { length: number; angle: number; mid: Pt } {
  const dx = b.to.x - b.from.x;
  const dy = b.to.y - b.from.y;
  return {
    length: Math.hypot(dx, dy),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    mid: { x: (b.from.x + b.to.x) / 2, y: (b.from.y + b.to.y) / 2 },
  };
}

/** Margin around a bone's placeholder for its picture (room for clothes, armour). */
export const BONE_MARGIN = 3;

/**
 * The box (viewBox units) a bone's picture fills: the bounding box of its
 * placeholder plus a margin. The artist draws the part IN THIS POSE, filling
 * this box; the game places the picture there (`_bone_<id>.png`).
 */
export function boneBox(b: BoneDef): { x: number; y: number; w: number; h: number } {
  const g = boneGeometry(b);
  const m = BONE_MARGIN;
  let minX: number;
  let maxX: number;
  let minY: number;
  let maxY: number;
  if (b.shape === 'oval') {
    const rx = Math.max(g.length / 2 + 2, b.width * 0.35);
    const ry = b.width / 2;
    const a = (g.angle * Math.PI) / 180;
    const ex = Math.sqrt((rx * Math.cos(a)) ** 2 + (ry * Math.sin(a)) ** 2);
    const ey = Math.sqrt((rx * Math.sin(a)) ** 2 + (ry * Math.cos(a)) ** 2);
    minX = g.mid.x - ex;
    maxX = g.mid.x + ex;
    minY = g.mid.y - ey;
    maxY = g.mid.y + ey;
  } else {
    const r = b.width / 2;
    minX = Math.min(b.from.x, b.to.x) - r;
    maxX = Math.max(b.from.x, b.to.x) + r;
    minY = Math.min(b.from.y, b.to.y) - r;
    maxY = Math.max(b.from.y, b.to.y) + r;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    x: round(minX - m),
    y: round(minY - m),
    w: round(maxX - minX + 2 * m),
    h: round(maxY - minY + 2 * m),
  };
}

/** Pixels per viewBox unit for the drawn pictures (120×160 → 480×640). */
export const BONE_ART_SCALE = 4;

/** The joints the canvas turns the layers at, and where the hands hold things. */
export const BONE_RIG = {
  neck: JOINTS.neck,
  /** The weapon layer turns at the RIGHT (near) shoulder; the weapon is in the right hand. */
  frontShoulder: JOINTS.rightShoulder,
  hand: JOINTS.rightHand,
  /** The off-hand layer turns at the LEFT (far) shoulder; the shield is in the left hand. */
  backShoulder: JOINTS.leftShoulder,
  backFist: JOINTS.leftFist,
} as const;

/** The head's crop for portraits (a square around the head, viewBox units). */
export const BONE_PORTRAIT = { x: 53.5, y: 18, size: 34 } as const;
