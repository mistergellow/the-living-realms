import { normalizeAppearance, type CharacterAppearance } from '@realms/shared';
import type { Texture } from 'pixi.js';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CharacterAvatar,
  type AvatarPart,
  type OffhandArt,
  type WeaponArt,
} from '../avatar/CharacterAvatar';
import { EnemyAvatar } from '../avatar/EnemyAvatar';
import { svgTexture } from './svg-texture';

/*
 * Turns the layered SVG art (features/avatar) into Pixi textures. The SVG
 * components stay the single source of the art: the DOM uses them directly
 * (lists, sheet, editor) and the canvas scenes rasterise them here.
 *
 * `inSvg` keeps exact pixel sizes (the DOM uses rem for the fluid UI).
 * Every layer keeps the avatar viewBox (120×160, feet at y≈150), drawn at
 * TEX_SCALE× so it stays sharp when scaled up on large or high-DPI screens.
 */
export const TEX_SCALE = 3;
const W = 120 * TEX_SCALE;
const H = 160 * TEX_SCALE;

export interface CharacterTextures {
  base: Texture;
  weapon: Texture;
  offhand: Texture;
  head: Texture;
  /** Head with closed eyes (blink frame). */
  headBlink: Texture;
}

function appearanceKey(appearance: CharacterAppearance | null | undefined): string {
  return JSON.stringify(normalizeAppearance(appearance));
}

export interface GearArt {
  weapon: WeaponArt;
  offhand: OffhandArt;
}

function part(
  appearance: CharacterAppearance | null | undefined,
  gear: GearArt,
  which: Exclude<AvatarPart, 'full'>,
  eyesClosed = false,
): Promise<Texture> {
  const key = `char:${appearanceKey(appearance)}:${gear.weapon}:${gear.offhand}:${which}:${eyesClosed}`;
  const markup = renderToStaticMarkup(
    <CharacterAvatar
      appearance={appearance}
      weapon={gear.weapon}
      offhand={gear.offhand}
      part={which}
      eyesClosed={eyesClosed}
      size={H}
      animated={false}
      inSvg
    />,
  );
  return svgTexture(key, markup, W, H);
}

export async function characterTextures(
  appearance: CharacterAppearance | null | undefined,
  gear: GearArt,
): Promise<CharacterTextures> {
  const [base, weapon, offhand, head, headBlink] = await Promise.all([
    part(appearance, gear, 'base'),
    part(appearance, gear, 'weapon'),
    part(appearance, gear, 'offhand'),
    part(appearance, gear, 'head'),
    part(appearance, gear, 'head', true),
  ]);
  return { base, weapon, offhand, head, headBlink };
}

export function enemyTexture(enemyDefId: string | null): Promise<Texture> {
  const markup = renderToStaticMarkup(
    <EnemyAvatar enemyDefId={enemyDefId} size={H} shadow={false} inSvg />,
  );
  return svgTexture(`enemy:${enemyDefId}`, markup, W, H);
}

/** Round head-and-shoulders portrait (already clipped to a circle). */
export const PORTRAIT_PX = 160;
export function portraitTexture(
  appearance: CharacterAppearance | null | undefined,
): Promise<Texture> {
  const markup = renderToStaticMarkup(
    <CharacterAvatar appearance={appearance} portrait size={PORTRAIT_PX} animated={false} inSvg />,
  );
  return svgTexture(`portrait:${appearanceKey(appearance)}`, markup, PORTRAIT_PX, PORTRAIT_PX);
}
