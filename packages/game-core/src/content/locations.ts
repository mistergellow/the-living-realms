import type { HexCoord } from '@realms/shared';
import { GATHERING_TERRAIN, PROFESSIONS } from './professions.js';
import { getRift } from './rifts.js';
import { mapHexAt, REGIONS, TERRAIN_NAMES, type Terrain } from './world-map.js';

/*
 * Places on the world map (request #40, rebuilt on the continent in #43).
 * Every land hex is a location: capitals are towns; other hexes are wilds
 * named by their terrain (forest, river, mountains, plains); some hexes hold a
 * Rift entrance; the roaming world boss adds its own action where it stands.
 * PROVISIONAL text and art (A75–A77).
 */

export type LocationKind = 'town' | 'wilds' | 'rift' | 'sea';

/** Painted scene shown at the top of the hex screen (one drawing per id in the web app). */
export type LocationScene = 'town' | 'wilds';

/**
 * What you can do in a place. `available: false` = shown but not built yet
 * (NPCs and shops come with the economy and NPC phases).
 */
export type LocationActionId =
  'npcs' | 'shop' | 'storage' | 'blacksmith' | 'rifts' | 'workshop' | 'map' | 'worldboss';

export interface LocationAction {
  id: LocationActionId;
  label: string;
  description: string;
  available: boolean;
}

export interface LocationDef {
  id: string;
  name: string;
  kind: LocationKind;
  scene: LocationScene;
  terrain: Terrain | null;
  /** Region name (nation or the Riftlands). */
  region: string | null;
  description: string;
  actions: readonly LocationAction[];
  /** The Rift entrance here, if any. */
  riftId: string | null;
}

const ACTION: Record<Exclude<LocationActionId, 'rifts' | 'workshop'>, LocationAction> = {
  npcs: {
    id: 'npcs',
    label: 'Talk to people',
    description: 'The townsfolk will have stories, quests and gossip.',
    available: false,
  },
  // Request #50: city services.
  shop: {
    id: 'shop',
    label: 'General store',
    description: 'Buy basic supplies; sell gear you do not need.',
    available: true,
  },
  storage: {
    id: 'storage',
    label: 'Storage',
    description: 'Keep items safe here, out of your bag.',
    available: true,
  },
  blacksmith: {
    id: 'blacksmith',
    label: 'Blacksmith',
    description: 'Upgrade your weapons (+1 to +10). They can break!',
    available: true,
  },
  map: {
    id: 'map',
    label: 'Travel',
    description: 'Open the world map and travel (costs AP).',
    available: true,
  },
  worldboss: {
    id: 'worldboss',
    label: 'World boss',
    description: 'The season’s world boss is here. Fight it and climb the leaderboard.',
    available: true,
  },
};

const TERRAIN_TEXT: Record<Terrain, string> = {
  plains: 'Open fields and farmland under a wide sky.',
  forest: 'Old trees, game trails and herbs in the undergrowth.',
  river: 'Cold water runs fast over the stones. Fish rise in the shallows.',
  mountain: 'Bare rock and old mine shafts. Ore glints in the walls.',
  city: 'The capital: walls, markets and the seat of the crown.',
};

/** Gathering professions possible on a terrain, e.g. "Fishing". */
function gatheringOn(terrain: Terrain): string[] {
  return Object.entries(GATHERING_TERRAIN)
    .filter(([, ts]) => ts?.includes(terrain))
    .map(([id]) => (PROFESSIONS as Record<string, { name: string }>)[id]!.name);
}

function workshop(terrain: Terrain): LocationAction {
  const here = gatheringOn(terrain);
  return {
    id: 'workshop',
    label: 'Professions',
    description: here.length
      ? `Gather here: ${here.join(', ')}. Crafting works anywhere.`
      : 'Craft, repair and improve your gear.',
    available: true,
  };
}

/** The place at a hex. `worldBossHere` adds the world boss action. */
export function locationAt(hex: HexCoord, opts: { worldBossHere?: boolean } = {}): LocationDef {
  const m = mapHexAt(hex);
  const boss = opts.worldBossHere ? [ACTION.worldboss] : [];
  if (!m)
    return {
      id: 'sea',
      name: 'Open sea',
      kind: 'sea',
      scene: 'wilds',
      terrain: null,
      region: null,
      description: 'Nothing but water.',
      actions: [ACTION.map],
      riftId: null,
    };
  const region = REGIONS[m.region];
  if (m.capital)
    return {
      id: `capital_${m.region}`,
      name: m.capital,
      kind: 'town',
      scene: 'town',
      terrain: 'city',
      region: region.name,
      description: `${TERRAIN_TEXT.city} ${region.name}.`,
      actions: [
        ACTION.shop,
        ACTION.storage,
        ACTION.blacksmith,
        workshop('city'),
        ACTION.npcs,
        ...boss,
        ACTION.map,
      ],
      riftId: null,
    };
  const corrupted =
    m.region === 'riftlands'
      ? ' The Rift taints everything here' +
        (m.riftDepth !== null && m.riftDepth > 0.6 ? ', and it is strongest this deep.' : '.')
      : '';
  const rift = m.rift ? getRift(m.rift.id) : undefined;
  const riftAction: LocationAction[] = rift
    ? [
        {
          id: 'rifts',
          label: `Enter the Rift · tier ${rift.tier}`,
          description: 'Alone or with a party gathered here.',
          available: true,
        },
      ]
    : [];
  return {
    id: rift ? rift.id : 'wilds',
    name: rift ? rift.name : `${TERRAIN_NAMES[m.terrain]} · ${region.name}`,
    kind: rift ? 'rift' : 'wilds',
    scene: 'wilds',
    terrain: m.terrain,
    region: region.name,
    description: TERRAIN_TEXT[m.terrain] + corrupted,
    actions: [...riftAction, ...boss, workshop(m.terrain), ACTION.map],
    riftId: rift?.id ?? null,
  };
}
