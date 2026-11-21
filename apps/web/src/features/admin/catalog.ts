import {
  ABILITIES,
  ITEMS,
  toCustomAbilityDef,
  toCustomItemDef,
  type AbilityDef,
  type ItemDef,
} from '@realms/game-core';
import type { CustomContentDto } from '@realms/shared';

/* Everything the admin can pick from: built-in content + admin-made content. */

export interface CatalogGroup<T> {
  label: string;
  entries: T[];
}

export function itemGroups(custom: CustomContentDto | undefined): CatalogGroup<ItemDef>[] {
  const builtIn = Object.values(ITEMS) as ItemDef[];
  const byKind = (kind: ItemDef['kind']) => builtIn.filter((i) => i.kind === kind);
  return [
    { label: 'Custom items', entries: (custom?.items ?? []).map(toCustomItemDef) },
    { label: 'Weapons', entries: byKind('weapon') },
    { label: 'Off-hands', entries: byKind('offhand') },
    { label: 'Armor', entries: byKind('armor') },
    { label: 'Accessories', entries: byKind('accessory') },
  ].filter((g) => g.entries.length);
}

/** Abilities that can be granted (universal ones are excluded: everyone has them). */
export function abilityGroups(custom: CustomContentDto | undefined): CatalogGroup<AbilityDef>[] {
  const builtIn = (Object.values(ABILITIES) as AbilityDef[]).filter(
    (a) => a.source !== 'universal',
  );
  return [
    { label: 'Custom abilities', entries: (custom?.abilities ?? []).map(toCustomAbilityDef) },
    { label: 'Weapon abilities', entries: builtIn.filter((a) => a.source !== 'enemy') },
    { label: 'Enemy abilities', entries: builtIn.filter((a) => a.source === 'enemy') },
  ].filter((g) => g.entries.length);
}
