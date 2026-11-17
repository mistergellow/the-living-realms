import type { ItemDefId } from './items.js';
import type { EnemyId } from './enemies.js';

/*
 * Rift definitions (data). A Rift is a portal to a raid: several rooms, the
 * last one with a boss (decision D17). Difficulty does not scale with the
 * number of players (D18). PROVISIONAL CONTENT.
 */

export interface RiftRoomDef {
  name: string;
  /** Enemy placement: slot 0–2 front row, 3–5 back row. */
  enemies: Array<{ enemy: EnemyId; slot: number }>;
  isBoss?: boolean;
}

export interface LootEntry {
  item: ItemDefId;
  /** Relative weight. */
  weight: number;
}

export interface RiftDef {
  id: string;
  name: string;
  description: string;
  rooms: RiftRoomDef[];
  rewards: {
    /** Reputation granted to each participant on victory. */
    reputation: number;
    /** Number of item drops per participant on victory. */
    drops: number;
    loot: LootEntry[];
  };
}

const rift = (r: RiftDef) => r;

export const RIFTS = {
  shattered_breach: rift({
    id: 'shattered_breach',
    name: 'Shattered Breach',
    description: 'A small, unstable rift. A good place to test your mettle.',
    rooms: [
      {
        name: 'The Threshold',
        enemies: [
          { enemy: 'rift_husk', slot: 0 },
          { enemy: 'rift_husk', slot: 1 },
          { enemy: 'shard_spitter', slot: 4 },
        ],
      },
      {
        name: 'Howling Gallery',
        enemies: [
          { enemy: 'hollow_hound', slot: 0 },
          { enemy: 'rift_husk', slot: 2 },
          { enemy: 'shard_spitter', slot: 3 },
        ],
      },
      {
        name: "Warden's Seal",
        isBoss: true,
        enemies: [
          { enemy: 'rift_warden', slot: 1 },
          { enemy: 'shard_spitter', slot: 4 },
        ],
      },
    ],
    rewards: {
      reputation: 25,
      drops: 1,
      loot: [
        { item: 'wooden_shield', weight: 3 },
        { item: 'leather_cap', weight: 3 },
        { item: 'leather_leggings', weight: 3 },
        { item: 'ring_of_vigor', weight: 1 },
        { item: 'charm_of_focus', weight: 1 },
      ],
    },
  }),
} satisfies Record<string, RiftDef>;

export type RiftId = keyof typeof RIFTS;

export function getRift(id: string): RiftDef | undefined {
  return (RIFTS as Record<string, RiftDef>)[id];
}
