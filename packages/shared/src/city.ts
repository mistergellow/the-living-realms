import { z } from 'zod';
import type { CharacterSheetDto, ItemDto } from './api.js';

/** City services in a capital (request #50): storage, general store, blacksmith. */
export interface CityDto {
  /** Name of the capital you are in, or null when you are not in one. */
  capital: string | null;
  sheet: CharacterSheetDto;
  storage: ItemDto[];
  bag: { used: number; slots: number };
  /** Request #59: storage size (80; more can be unlocked later). */
  storageSlots: number;
  /** Request #59: each offer carries the item card (for the grid and its tooltip). */
  shop: Array<{ defId: string; name: string; price: number; item: ItemDto }>;
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
      /**
       * Request #54: the weapon now and after the upgrade, for the comparison
       * tooltip. `power` = bonus on the weapon's ability values (percent).
       */
      compare: {
        now: { damage: { min: number; max: number }; power: number };
        next: { damage: { min: number; max: number }; power: number };
      };
      /** The item as it would be after a successful upgrade. */
      preview: ItemDto;
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
/** Request #59: move (or split, merge, swap) an item to a bag or storage position. */
export const moveItemSchema = z.object({
  itemId: z.uuid(),
  to: z.enum(['bag', 'storage']),
  slot: z.number().int().min(0).max(999),
  qty: z.number().int().min(1).optional(),
});
export const sortItemsSchema = z.object({ place: z.enum(['bag', 'storage']) });
export const upgradeSchema = z.object({ itemId: z.uuid(), blessing: z.boolean().default(false) });
