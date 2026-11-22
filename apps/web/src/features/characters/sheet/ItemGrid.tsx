import type { ItemDto } from '@realms/shared';
import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { ItemIcon } from './ItemIcon';
import { isGear } from './item-filters';

/*
 * Request #59: the bag and the storage are grids of fixed positions. Items
 * stay where you drop them; dropping on the same item merges the stack,
 * Shift + drop splits it, dropping on another item swaps them.
 */

export type Place = 'bag' | 'storage';
/** Drop-target key of a cell: "bag:3", "storage:41". */
export const cellKey = (place: Place, slot: number) => `${place}:${slot}`;
export function parseCellKey(key: string | null): { place: Place; slot: number } | null {
  const m = key ? /^(bag|storage):(\d+)$/.exec(key) : null;
  return m ? { place: m[1] as Place, slot: Number(m[2]) } : null;
}

export function ItemGrid({
  place,
  items,
  size,
  cols,
  over,
  dimmed,
  bind,
  tip,
  onDoubleClick,
  onClick,
  selected,
  badge,
  testId,
}: {
  place: Place;
  items: ItemDto[];
  /** Number of slots (more cells show if items sit beyond it). */
  size: number;
  cols: number;
  /** Drop key under the pointer while dragging. */
  over: string | null;
  /** Items that do not match the search/filter are dimmed, not moved. */
  dimmed?: (i: ItemDto) => boolean;
  bind: (item: ItemDto) => HTMLAttributes<HTMLElement>;
  tip?: (item: ItemDto) => HTMLAttributes<HTMLElement>;
  onDoubleClick?: (item: ItemDto) => void;
  onClick?: (item: ItemDto) => void;
  /** Id of the selected item (shop). */
  selected?: string | null;
  /** Small label on the tile, e.g. a price. */
  badge?: (item: ItemDto) => ReactNode;
  testId?: string;
}) {
  const bySlot = new Map(items.filter((i) => i.slot !== null).map((i) => [i.slot!, i]));
  const last = Math.max(size, ...items.map((i) => (i.slot ?? 0) + 1));
  return (
    <div className="bag-grid" data-testid={testId} style={{ ['--cols' as string]: cols }}>
      {Array.from({ length: last }, (_, n) => {
        const item = bySlot.get(n);
        const key = cellKey(place, n);
        const extra = n >= size ? true : undefined;
        if (!item)
          return (
            <span
              key={key}
              className="bag-cell"
              data-empty
              data-drop={key}
              data-over={over === key ? true : undefined}
              data-extra={extra}
              data-testid={`${place}-cell-${n}`}
            />
          );
        return (
          <button
            key={key}
            className="bag-cell"
            data-drop={key}
            data-over={over === key ? true : undefined}
            data-extra={extra}
            data-rarity={item.rarity}
            data-dim={dimmed?.(item) ? true : undefined}
            aria-label={item.name}
            data-testid={`${place}-item-${item.defId}`}
            data-slot={n}
            {...bind(item)}
            {...tip?.(item)}
            data-selected={selected === item.id ? true : undefined}
            onDoubleClick={() => onDoubleClick?.(item)}
            onClick={() => onClick?.(item)}
          >
            <ItemIcon item={item} />
            {badge?.(item)}
            {item.quantity > 1 && <span className="bag-qty">{item.quantity}</span>}
            {isGear(item) && (
              <span className="bag-q">
                <i
                  style={{
                    width: `${item.quality}%`,
                    background:
                      item.quality <= 0
                        ? 'var(--danger)'
                        : item.quality <= 25
                          ? 'var(--warning)'
                          : 'var(--success)',
                  }}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Choose how many of a stack to move (Shift + drop). */
export function SplitDialog({
  item,
  onConfirm,
  onCancel,
}: {
  item: ItemDto;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(Math.max(1, Math.floor(item.quantity / 2)));
  return (
    <div className="split-backdrop" onClick={onCancel}>
      <form
        className="panel split-dialog"
        data-testid="split-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(qty);
        }}
      >
        <div className="panel-title">
          <span>Split {item.name}</span>
        </div>
        <input
          type="range"
          min={1}
          max={item.quantity - 1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          aria-label="How many"
        />
        <p style={{ margin: 0, textAlign: 'center' }}>
          Move <strong className="v">{qty}</strong> · keep{' '}
          <strong className="v">{item.quantity - qty}</strong>
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary">Split</button>
        </div>
      </form>
    </div>
  );
}

/** Toolbar over a grid: search, filter chips and Sort. */
export function GridTools({
  search,
  onSearch,
  children,
  onSort,
  sortDisabled,
  label,
}: {
  search: string;
  onSearch: (s: string) => void;
  children?: ReactNode;
  onSort: () => void;
  sortDisabled?: boolean;
  label: string;
}) {
  return (
    <div className="grid-tools">
      <input
        className="bag-search"
        type="search"
        placeholder="Search…"
        aria-label={`Search the ${label}`}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      {children}
      <button
        className="btn btn-sm"
        onClick={onSort}
        disabled={sortDisabled}
        aria-label={`Sort the ${label}`}
      >
        Sort
      </button>
    </div>
  );
}
