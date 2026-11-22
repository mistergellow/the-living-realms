import { RARITY_NAMES } from '@realms/game-core';
import type { ItemRarity } from '@realms/shared';
import { Icon } from '../../shared/ui/Icon';

/**
 * Loot shown as cards coloured by rarity (request #50): used by the popup of
 * a Treasure / Secret room and by the end-of-Rift result.
 */
export function LootList({
  items,
  gold,
}: {
  items: Array<{ name: string; rarity?: ItemRarity; who?: string }>;
  gold?: number;
}) {
  return (
    <ul className="loot-list" data-testid="loot-list">
      {!!gold && (
        <li className="loot-card" data-rarity="legendary">
          <Icon name="coin" />
          <span>
            <strong className="rarity-text">{gold} gold</strong>
          </span>
        </li>
      )}
      {items.map((it, i) => (
        <li key={i} className="loot-card" data-rarity={it.rarity ?? 'common'}>
          <Icon name="bag" />
          <span>
            <strong className="rarity-text">{it.name}</strong>
            <small>
              {RARITY_NAMES[it.rarity ?? 'common']}
              {it.who ? ` · ${it.who}` : ''}
            </small>
          </span>
        </li>
      ))}
    </ul>
  );
}
