import type { RegionId } from '@realms/game-core';

/** Region colours on the map and in character creation (placeholders, A64). */
export const REGION_COLORS: Readonly<Record<RegionId, number>> = {
  west: 0x2f5d9e,
  east: 0x9e3b32,
  north: 0x3d7f48,
  riftlands: 0x5a2f78,
};

export const cssColor = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
