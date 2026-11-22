import { z } from 'zod';
import type { CharacterSheetDto, ItemDto } from './api.js';

/** City services in a capital (request #50): storage, general store, blacksmith. */
export interface CityDto {
  /** Name of the capital you are in, or null when you are not in one. */
  capital: string | null;
  sheet: CharacterSheetDto;
  storage: ItemDto[];
  bag: { used: number; slots: number };
  shop: Array<{ defId: string; name: string; price: number }>;
  /** What the store pays for each bag item it buys (gear only); id → gold. */
  sellPrices: Record<string, number>;
  /** Next upgrade of each weapon you carry or wear; id → quote. */
  upgrades: Record<
    string,
    {
      toLevel: number;
      gold: number;
      chance: number;
      material: { defId: string; name: string; qty: number; have: number } | null;
    }
  >;
  /** Blessing Scrolls you carry. */
  blessingScrolls: number;
  /** Result of the last action, if any. */
  message: string | null;
  upgrade: { result: 'success' | 'downgraded' | 'destroyed'; level: number } | null;
}

export const itemActionSchema = z.object({ itemId: z.uuid() });
export const buySchema = z.object({
  defId: z.string().max(64),
  qty: z.number().int().min(1).max(99).default(1),
});
export const upgradeSchema = z.object({ itemId: z.uuid(), blessing: z.boolean().default(false) });
