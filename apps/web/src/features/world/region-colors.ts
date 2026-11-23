import type { RegionId } from '@realms/game-core';

/**
 * Region colours on the map and in character creation (placeholders, A64;
 * muted for the gothic look of request #69).
 */
export const REGION_COLORS: Readonly<Record<RegionId, number>> = {
  west: 0x3d5568,
  east: 0x7a3a2a,
  north: 0x4d5c42,
  riftlands: 0x4a3352,
};

export const cssColor = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
