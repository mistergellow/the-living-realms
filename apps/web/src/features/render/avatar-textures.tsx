import { normalizeAppearance, type CharacterAppearance } from '@realms/shared';
import type { Texture } from 'pixi.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterAvatar, type AvatarPart, type WeaponArt } from '../avatar/CharacterAvatar';
import { EnemyAvatar } from '../avatar/EnemyAvatar';
import { svgTexture } from './svg-texture';

/*
 * Turns the layered SVG art (features/avatar) into Pixi textures. The SVG
 * components stay the single source of the art: the DOM uses them directly
 * (lists, sheet, editor) and the canvas scenes rasterise them here.
 *
 * Every layer keeps the avatar viewBox (120×160, feet at y≈150), drawn at
 * TEX_SCALE× so it stays sharp when scaled up on large or high-DPI screens.
 */
export const TEX_SCALE = 3;
const W = 120 * TEX_SCALE;
const H = 160 * TEX_SCALE;

export interface CharacterTextures {
  base: Texture;
  weapon: Texture;
  head: Texture;
  /** Head with closed eyes (blink frame). */
  headBlink: Texture;
}

function appearanceKey(appearance: CharacterAppearance | null | undefined): string {
  return JSON.stringify(normalizeAppearance(appearance));
}

function part(
  appearance: CharacterAppearance | null | undefined,
  weapon: WeaponArt,
  which: Exclude<AvatarPart, 'full'>,
  eyesClosed = false,
): Promise<Texture> {
  const key = `char:${appearanceKey(appearance)}:${weapon}:${which}:${eyesClosed}`;
  const markup = renderToStaticMarkup(
    <CharacterAvatar
      appearance={appearance}
      weapon={weapon}
      part={which}
      eyesClosed={eyesClosed}
      size={H}
      animated={false}
    />,
  );
  return svgTexture(key, markup, W, H);
}

export async function characterTextures(
  appearance: CharacterAppearance | null | undefined,
  weapon: WeaponArt,
): Promise<CharacterTextures> {
  const [base, w, head, headBlink] = await Promise.all([
    part(appearance, weapon, 'base'),
    part(appearance, weapon, 'weapon'),
    part(appearance, weapon, 'head'),
    part(appearance, weapon, 'head', true),
  ]);
  return { base, weapon: w, head, headBlink };
}

export function enemyTexture(enemyDefId: string | null): Promise<Texture> {
  const markup = renderToStaticMarkup(
    <EnemyAvatar enemyDefId={enemyDefId} size={H} shadow={false} />,
  );
  return svgTexture(`enemy:${enemyDefId}`, markup, W, H);
}

/** Round head-and-shoulders portrait (already clipped to a circle). */
export const PORTRAIT_PX = 160;
export function portraitTexture(
  appearance: CharacterAppearance | null | undefined,
): Promise<Texture> {
  const markup = renderToStaticMarkup(
    <CharacterAvatar appearance={appearance} portrait size={PORTRAIT_PX} animated={false} />,
  );
  return svgTexture(`portrait:${appearanceKey(appearance)}`, markup, PORTRAIT_PX, PORTRAIT_PX);
}
