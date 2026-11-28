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

export const JOINTS = {
  crown: { x: 60, y: 10 },
  neck: { x: 60, y: 44.74 },
  neckBase: { x: 60, y: 50 },
  waist: { x: 60, y: 82 },
  hipCenter: { x: 60, y: 96 },
  frontShoulder: { x: 76.15, y: 49.11 },
  frontElbow: { x: 89, y: 65 },
  frontWrist: { x: 101, y: 72 },
  frontHand: { x: 106.74, y: 74.38 },
  backShoulder: { x: 44.42, y: 49.11 },
  backElbow: { x: 38, y: 73 },
  backWrist: { x: 33, y: 92 },
  backFist: { x: 31.88, y: 97.56 },
  frontHip: { x: 66, y: 94 },
  frontKnee: { x: 70, y: 121 },
  frontAnkle: { x: 69, y: 145 },
  frontToe: { x: 81, y: 149 },
  backHip: { x: 54, y: 94 },
  backKnee: { x: 49, y: 121 },
  backAnkle: { x: 46, y: 145 },
  backToe: { x: 57, y: 149 },
} as const satisfies Record<string, Pt>;

const J = JOINTS;

/** Back to front: the order they are drawn in. */
export const BONES: readonly BoneDef[] = [
  // back arm (the off-hand layer, behind the body)
  {
    id: 'upper_arm_back',
    label: 'Upper arm (back)',
    color: '#911eb4',
    from: J.backShoulder,
    to: J.backElbow,
    width: 8,
    shape: 'capsule',
    layer: 'offhand',
  },
  {
    id: 'forearm_back',
    label: 'Forearm (back)',
    color: '#f032e6',
    from: J.backElbow,
    to: J.backWrist,
    width: 7,
    shape: 'capsule',
    layer: 'offhand',
  },
  {
    id: 'hand_back',
    label: 'Hand (back)',
    color: '#a9a9a9',
    from: J.backWrist,
    to: J.backFist,
    width: 8,
    shape: 'oval',
    layer: 'offhand',
  },
  // body
  {
    id: 'thigh_back',
    label: 'Thigh (back)',
    color: '#800000',
    from: J.backHip,
    to: J.backKnee,
    width: 11,
    shape: 'capsule',
    layer: 'base',
  },
  {
    id: 'shin_back',
    label: 'Shin (back)',
    color: '#aaffc3',
    from: J.backKnee,
    to: J.backAnkle,
    width: 9,
    shape: 'capsule',
    layer: 'base',
  },
  {
    id: 'foot_back',
    label: 'Foot (back)',
    color: '#808000',
    from: J.backAnkle,
    to: J.backToe,
    width: 7,
    shape: 'capsule',
    layer: 'base',
  },
  {
    id: 'thigh_front',
    label: 'Thigh (front)',
    color: '#469990',
    from: J.frontHip,
    to: J.frontKnee,
    width: 11,
    shape: 'capsule',
    layer: 'base',
  },
  {
    id: 'shin_front',
    label: 'Shin (front)',
    color: '#dcbeff',
    from: J.frontKnee,
    to: J.frontAnkle,
    width: 9,
    shape: 'capsule',
    layer: 'base',
  },
  {
    id: 'foot_front',
    label: 'Foot (front)',
    color: '#9a6324',
    from: J.frontAnkle,
    to: J.frontToe,
    width: 7,
    shape: 'capsule',
    layer: 'base',
  },
  {
    id: 'pelvis',
    label: 'Pelvis / hips',
    color: '#bfef45',
    from: J.waist,
    to: J.hipCenter,
    width: 26,
    shape: 'oval',
    layer: 'base',
  },
  {
    id: 'torso',
    label: 'Torso / chest',
    color: '#ffe119',
    from: J.neckBase,
    to: J.waist,
    width: 32,
    shape: 'oval',
    layer: 'base',
  },
  // front arm (the weapon layer, in front of the body)
  {
    id: 'upper_arm_front',
    label: 'Upper arm (front)',
    color: '#3cb44b',
    from: J.frontShoulder,
    to: J.frontElbow,
    width: 8,
    shape: 'capsule',
    layer: 'weapon',
  },
  {
    id: 'forearm_front',
    label: 'Forearm (front)',
    color: '#42d4f4',
    from: J.frontElbow,
    to: J.frontWrist,
    width: 7,
    shape: 'capsule',
    layer: 'weapon',
  },
  {
    id: 'hand_front',
    label: 'Hand (front)',
    color: '#4363d8',
    from: J.frontWrist,
    to: J.frontHand,
    width: 8,
    shape: 'oval',
    layer: 'weapon',
  },
  // head
  {
    id: 'neck',
    label: 'Neck',
    color: '#f58231',
    from: J.neckBase,
    to: J.neck,
    width: 9,
    shape: 'capsule',
    layer: 'head',
  },
  {
    id: 'head',
    label: 'Head',
    color: '#e6194b',
    from: J.neck,
    to: J.crown,
    width: 28,
    shape: 'oval',
    layer: 'head',
  },
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
