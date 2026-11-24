/*
 * Held weapons (request #76): the owner's weapon sheet (art/source/weapons.webp)
 * cut into one image per weapon type. Each entry places the image so its grip
 * sits in the hand: `gx`/`gy` = the grip in the image (viewBox units),
 * `rot` = the rotation that turns it into its pose, `angle` = the direction
 * from the hand to the tip once posed (degrees; 90 = straight down) and
 * `reach` = hand-to-tip length. Generated from the sheet (principal axis of
 * each piece); one-handed weapons drawn 25% larger. PROVISIONAL poses.
 */
import axeSrc from './weapons/axe.webp?inline';
import bowSrc from './weapons/bow.webp?inline';
import chakramSrc from './weapons/chakram.webp?inline';
import crossbowSrc from './weapons/crossbow.webp?inline';
import daggerSrc from './weapons/dagger.webp?inline';
import greataxeSrc from './weapons/greataxe.webp?inline';
import greathammerSrc from './weapons/greathammer.webp?inline';
import greatswordSrc from './weapons/greatsword.webp?inline';
import hammerSrc from './weapons/hammer.webp?inline';
import handaxeSrc from './weapons/handaxe.webp?inline';
import lanceSrc from './weapons/lance.webp?inline';
import maceSrc from './weapons/mace.webp?inline';
import morningstarSrc from './weapons/morningstar.webp?inline';
import quiverSrc from './weapons/quiver.webp?inline';
import scepterSrc from './weapons/scepter.webp?inline';
import scytheSrc from './weapons/scythe.webp?inline';
import slingSrc from './weapons/sling.webp?inline';
import spearSrc from './weapons/spear.webp?inline';
import staffSrc from './weapons/staff.webp?inline';
import swordSrc from './weapons/sword.webp?inline';
import tomeSrc from './weapons/tome.webp?inline';
import wandSrc from './weapons/wand.webp?inline';

export interface WeaponPose {
  src: string;
  w: number;
  h: number;
  gx: number;
  gy: number;
  rot: number;
  angle: number;
  reach: number;
}

/** One-handed weapons are drawn larger than on the sheet (chunkier, as in the art). */
const ONE_HANDED = new Set([
  'sword',
  'axe',
  'dagger',
  'handaxe',
  'mace',
  'morningstar',
  'hammer',
  'wand',
  'scepter',
  'crossbow',
  'tome',
  'sling',
  'chakram',
  'bow',
]);
export const weaponScale = (type: string) => (ONE_HANDED.has(type) ? 1.25 : 1);

export const WEAPON_POSES: Record<string, WeaponPose> = {
  axe: { src: axeSrc, w: 46.86, h: 36.74, gx: 5.66, gy: 29.97, rot: 116.9, angle: 84, reach: 44.1 },
  bow: {
    src: bowSrc,
    w: 69.74,
    h: 29.04,
    gx: 36.49,
    gy: 11.35,
    rot: -112.2,
    angle: -96,
    reach: 35.8,
  },
  chakram: {
    src: chakramSrc,
    w: 33.44,
    h: 34.54,
    gx: 16.67,
    gy: 17.21,
    rot: 0,
    angle: 0,
    reach: 17.3,
  },
  crossbow: {
    src: crossbowSrc,
    w: 58.96,
    h: 37.62,
    gx: 17.79,
    gy: 25.35,
    rot: 13.8,
    angle: -4,
    reach: 42.6,
  },
  dagger: {
    src: daggerSrc,
    w: 36.3,
    h: 26.18,
    gx: 6.23,
    gy: 20.96,
    rot: 116.2,
    angle: 84,
    reach: 35.8,
  },
  greataxe: {
    src: greataxeSrc,
    w: 62.48,
    h: 51.26,
    gx: 6.39,
    gy: 43.63,
    rot: 119.3,
    angle: 84,
    reach: 63.5,
  },
  greathammer: {
    src: greathammerSrc,
    w: 52.36,
    h: 47.3,
    gx: 6.37,
    gy: 41.88,
    rot: 123.7,
    angle: 84,
    reach: 53.0,
  },
  greatsword: {
    src: greatswordSrc,
    w: 67.54,
    h: 57.2,
    gx: 7.85,
    gy: 49.58,
    rot: 123.6,
    angle: 84,
    reach: 76.7,
  },
  hammer: {
    src: hammerSrc,
    w: 48.18,
    h: 46.2,
    gx: 7.1,
    gy: 38.9,
    rot: 126.8,
    angle: 84,
    reach: 54.1,
  },
  handaxe: {
    src: handaxeSrc,
    w: 42.9,
    h: 33.66,
    gx: 5.12,
    gy: 27.45,
    rot: 116.2,
    angle: 84,
    reach: 40.2,
  },
  lance: {
    src: lanceSrc,
    w: 97.24,
    h: 27.28,
    gx: 29.39,
    gy: 18.48,
    rot: -81.5,
    angle: -96,
    reach: 69.5,
  },
  mace: {
    src: maceSrc,
    w: 45.32,
    h: 40.48,
    gx: 5.79,
    gy: 34.84,
    rot: 124.7,
    angle: 84,
    reach: 51.5,
  },
  morningstar: {
    src: morningstarSrc,
    w: 51.04,
    h: 30.8,
    gx: 6.4,
    gy: 25.82,
    rot: 108.0,
    angle: 84,
    reach: 48.2,
  },
  quiver: {
    src: quiverSrc,
    w: 39.38,
    h: 23.32,
    gx: 18.09,
    gy: 12.24,
    rot: 0,
    angle: 0,
    reach: 19.7,
  },
  scepter: {
    src: scepterSrc,
    w: 38.94,
    h: 38.28,
    gx: 7.83,
    gy: 30.48,
    rot: -15.2,
    angle: -60,
    reach: 41.8,
  },
  scythe: {
    src: scytheSrc,
    w: 82.06,
    h: 53.24,
    gx: 31.72,
    gy: 32.95,
    rot: -72.2,
    angle: -96,
    reach: 49.2,
  },
  sling: { src: slingSrc, w: 26.4, h: 29.92, gx: 15.58, gy: 16.75, rot: 0, angle: 0, reach: 15.0 },
  spear: {
    src: spearSrc,
    w: 88.66,
    h: 32.12,
    gx: 33.79,
    gy: 19.25,
    rot: -77.5,
    angle: -96,
    reach: 57.2,
  },
  staff: {
    src: staffSrc,
    w: 53.24,
    h: 63.8,
    gx: 19.76,
    gy: 39.49,
    rot: -45.2,
    angle: -96,
    reach: 49.3,
  },
  sword: {
    src: swordSrc,
    w: 45.76,
    h: 34.54,
    gx: 5.43,
    gy: 29.35,
    rot: 120.1,
    angle: 84,
    reach: 49.0,
  },
  tome: { src: tomeSrc, w: 30.14, h: 33.44, gx: 14.62, gy: 16.37, rot: 0, angle: 0, reach: 16.7 },
  wand: {
    src: wandSrc,
    w: 45.1,
    h: 24.86,
    gx: 7.22,
    gy: 19.39,
    rot: -9.2,
    angle: -35,
    reach: 41.6,
  },
};
