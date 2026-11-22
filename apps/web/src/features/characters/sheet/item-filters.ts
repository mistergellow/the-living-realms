import type { ItemDto } from '@realms/shared';

/** Item filters shared by the bag and the city storage (requests #50, #52). */
export type ItemFilter = 'all' | 'gear' | 'material' | 'consumable' | 'tool';
export const ITEM_FILTERS: Array<{ id: ItemFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'gear', label: 'Gear' },
  { id: 'material', label: 'Materials' },
  { id: 'consumable', label: 'Consumables' },
  { id: 'tool', label: 'Tools' },
];
export const isGear = (i: ItemDto) => i.slots.length > 0;

/** Whether an item passes a filter and a search text (by name). */
export function itemMatches(i: ItemDto, f: ItemFilter, search = ''): boolean {
  const q = search.trim().toLowerCase();
  const kind = f === 'all' || (f === 'gear' ? isGear(i) : i.kind === f);
  return kind && (!q || i.name.toLowerCase().includes(q));
}
