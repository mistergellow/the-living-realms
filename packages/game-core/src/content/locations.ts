import type { HexCoord } from '@realms/shared';
import { hexKey } from '../hex.js';

/*
 * Places on the world map (request #40). Every hex is a location: a few are
 * named places (towns, …) with their own scene and actions; every other hex
 * is open wilderness. PROVISIONAL CONTENT (names, scenes, actions): see
 * docs/REQUESTS.md → "Decisões em aberto" A75–A77.
 */

/** Kinds of place. Decides the default actions and the scene art. */
export type LocationKind = 'town' | 'wilds';

/** Painted scene shown at the top of the hex screen (one drawing per id in the web app). */
export type LocationScene = 'town' | 'wilds';

/**
 * What you can do in a place. `available: false` = shown but not built yet
 * (NPCs and shops come with the economy and NPC phases).
 */
export type LocationActionId = 'npcs' | 'shop' | 'rifts' | 'workshop' | 'map';

export interface LocationAction {
  id: LocationActionId;
  label: string;
  description: string;
  available: boolean;
}

export interface LocationDef {
  /** Stable id; `wilds` for any hex without a named place. */
  id: string;
  name: string;
  kind: LocationKind;
  scene: LocationScene;
  description: string;
  actions: readonly LocationAction[];
}

const ACTION: Record<LocationActionId, LocationAction> = {
  npcs: {
    id: 'npcs',
    label: 'Talk to people',
    description: 'The townsfolk will have stories, quests and gossip.',
    available: false,
  },
  shop: {
    id: 'shop',
    label: 'Market',
    description: 'Buy and sell goods.',
    available: false,
  },
  rifts: {
    id: 'rifts',
    label: 'Rifts',
    description: 'Enter a Rift alone or gather a party.',
    available: true,
  },
  workshop: {
    id: 'workshop',
    label: 'Workshop',
    description: 'Practise your professions: craft, repair, gather.',
    available: true,
  },
  map: {
    id: 'map',
    label: 'Leave',
    description: 'Go out to the world map.',
    available: true,
  },
};

/** Named places, keyed by hex. The world spawn (0, 0) is the starting town. */
const NAMED: Record<string, LocationDef> = {
  [hexKey({ q: 0, r: 0 })]: {
    id: 'emberhold',
    name: 'Emberhold',
    kind: 'town',
    scene: 'town',
    description:
      'A walled town under an old keep, where every road into the realms begins. ' +
      'Lanterns burn late in the market square.',
    actions: [ACTION.npcs, ACTION.shop, ACTION.workshop, ACTION.rifts, ACTION.map],
  },
};

const WILDS: Omit<LocationDef, 'description'> = {
  id: 'wilds',
  name: 'Open wilds',
  kind: 'wilds',
  scene: 'wilds',
  actions: [ACTION.rifts, ACTION.workshop, ACTION.map],
};

/** The place at a hex: a named location, or open wilderness. */
export function locationAt(hex: HexCoord): LocationDef {
  return (
    NAMED[hexKey(hex)] ?? {
      ...WILDS,
      description: 'Grass, stones and wind. Nothing here has a name yet.',
    }
  );
}

/** All named places (for the map, later). */
export function namedLocations(): Array<{ hex: HexCoord; location: LocationDef }> {
  return Object.entries(NAMED).map(([key, location]) => {
    const [q, r] = key.split(',').map(Number) as [number, number];
    return { hex: { q, r }, location };
  });
}
