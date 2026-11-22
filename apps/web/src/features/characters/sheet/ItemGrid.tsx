import type { ItemDto } from '@realms/shared';
import { useEffect, useState, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
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
  onContextMenu,
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
  /** Request #68: right click on an item (opens its menu). */
  onContextMenu?: (item: ItemDto, at: { x: number; y: number }) => void;
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
            onContextMenu={
              onContextMenu
                ? (e: MouseEvent) => {
                    e.preventDefault();
                    onContextMenu(item, { x: e.clientX, y: e.clientY });
                  }
                : undefined
            }
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

/** Request #68: small menu at the pointer (right click on an item). */
export function ItemMenu({
  at,
  actions,
  onClose,
}: {
  at: { x: number; y: number };
  actions: Array<{ label: string; onSelect: () => void; danger?: boolean; testId?: string }>;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  // Keep the menu inside the window.
  const x = Math.min(at.x, window.innerWidth - 170);
  const y = Math.min(at.y, window.innerHeight - 40 * actions.length - 16);
  return (
    <div
      className="item-menu-backdrop"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="panel item-menu"
        role="menu"
        data-testid="item-menu"
        style={{ left: Math.max(8, x), top: Math.max(8, y) }}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            role="menuitem"
            className="item-menu-btn"
            data-danger={a.danger ? true : undefined}
            data-testid={a.testId}
            onClick={() => {
              onClose();
              a.onSelect();
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Request #68: confirm throwing an item away (choose how many of a stack). */
export function DropDialog({
  item,
  onConfirm,
  onCancel,
}: {
  item: ItemDto;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(item.quantity);
  return (
    <div className="split-backdrop" onClick={onCancel}>
      <form
        className="panel split-dialog"
        data-testid="drop-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(qty);
        }}
      >
        <div className="panel-title">
          <span>Drop {item.name}?</span>
        </div>
        {item.quantity > 1 && (
          <>
            <input
              type="range"
              min={1}
              max={item.quantity}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              aria-label="How many"
            />
            <p style={{ margin: 0, textAlign: 'center' }}>
              Drop <strong className="v">{qty}</strong> of {item.quantity}
            </p>
          </>
        )}
        <p className="muted small" style={{ margin: 0, textAlign: 'center' }}>
          Dropped items are gone for good.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-sm btn-danger" data-testid="drop-confirm">
            Drop
          </button>
        </div>
      </form>
    </div>
  );
}
