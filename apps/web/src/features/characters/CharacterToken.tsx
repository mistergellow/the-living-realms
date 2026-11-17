import type { AppearanceEmblem, CharacterAppearance } from '@realms/shared';

/** SVG path for each emblem, drawn in a 24x24 box centered at (0,0). */
const EMBLEM_PATHS: Record<AppearanceEmblem, string> = {
  circle: 'M0,-7 A7,7 0 1,1 0,7 A7,7 0 1,1 0,-7 Z',
  square: 'M-6,-6 H6 V6 H-6 Z',
  diamond: 'M0,-8 L8,0 L0,8 L-8,0 Z',
  triangle: 'M0,-8 L7.5,6 L-7.5,6 Z',
  star: 'M0,-8 L2.4,-2.5 L8,-2.5 L3.5,1.2 L5,7 L0,3.6 L-5,7 L-3.5,1.2 L-8,-2.5 L-2.4,-2.5 Z',
  cross: 'M-2.5,-8 H2.5 V-2.5 H8 V2.5 H2.5 V8 H-2.5 V2.5 H-8 V-2.5 H-2.5 Z',
  crescent: 'M3,-7.5 A8,8 0 1,0 3,7.5 A6,6 0 1,1 3,-7.5 Z',
  shield: 'M-7,-7 H7 V0 C7,5 3,7.5 0,8.5 C-3,7.5 -7,5 -7,0 Z',
};

/** Path data for an emblem, for embedding in another SVG (e.g. the hex map). */
export function emblemPath(emblem: AppearanceEmblem): string {
  return EMBLEM_PATHS[emblem];
}

export function CharacterToken({
  appearance,
  size = 40,
  title,
}: {
  appearance: Pick<CharacterAppearance, 'color' | 'emblem'>;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      role="img"
      aria-label={title ?? appearance.emblem}
    >
      <circle r="11.5" fill="#0b0d12" stroke={appearance.color} strokeWidth="1.5" />
      <path d={EMBLEM_PATHS[appearance.emblem]} fill={appearance.color} />
    </svg>
  );
}
