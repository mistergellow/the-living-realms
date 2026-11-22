import { z } from 'zod';
import type { ItemDto } from './api.js';

/* Player market (request #63): items for sale in one city each. */

export interface MarketListingDto {
  id: string;
  item: ItemDto;
  /** Gold for the whole listing (a stack sells as one). */
  price: number;
  sellerName: string;
  /** Your own listing. */
  mine: boolean;
  /** City the listing is in. */
  city: string;
}

export interface MarketDto {
  /** The capital you stand in (null = no market here). */
  capital: string | null;
  /** Listings in this city's market (yours included). */
  listings: MarketListingDto[];
  /** All your listings, in every city. */
  mine: MarketListingDto[];
  maxListings: number;
  gold: number;
  bag: ItemDto[];
  message: string | null;
}

export const marketListSchema = z.object({
  itemId: z.uuid(),
  price: z.number().int().min(1).max(10_000_000),
});
export const marketListingSchema = z.object({ listingId: z.uuid() });
