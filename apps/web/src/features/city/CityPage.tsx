import type { CityDto, ItemDto } from '@realms/shared';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { Icon } from '../../shared/ui/Icon';
import { useActiveCharacter } from '../characters/active-character';
import { ItemIcon } from '../characters/sheet/ItemIcon';
import { ItemTooltipBody } from '../characters/sheet/ItemTooltip';
import { DragGhost, useDragAndDrop } from '../characters/sheet/drag';
import { ITEM_FILTERS, itemMatches, type ItemFilter } from '../characters/sheet/item-filters';
import '../characters/sheet/sheet.css';
import { useCity, useCityAction } from './api';
import './city.css';

type Tab = 'shop' | 'storage' | 'blacksmith';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'shop', label: 'General store' },
  { id: 'storage', label: 'Storage' },
  { id: 'blacksmith', label: 'Blacksmith' },
];

/** City services in a capital (request #50): general store, storage, blacksmith. */
export function CityPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const { tab = 'shop' } = useParams();
  const navigate = useNavigate();
  const city = useCity(characterId);
  const action = useCityAction(characterId);
  if (!characterId) return <Navigate to="/" replace />;
  const c = city.data;
  const run = (path: string, body: Record<string, unknown>) => action.mutate({ path, body });

  return (
    <div className="screen-body">
      <div className="contain stack city" data-testid="city">
        <div className="row" style={{ alignItems: 'baseline' }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            {c?.capital ?? 'City'}
          </h1>
          <span className="spacer" />
          {c && (
            <span className="city-purse" data-testid="city-gold">
              <Icon name="coin" /> {c.sheet.gold} gold · bag {c.bag.used}/{c.bag.slots}
            </span>
          )}
        </div>
        {c && !c.capital && (
          <p className="muted">
            City services are only in capitals. Travel to one on the{' '}
            <Link to="/world">world map</Link>.
          </p>
        )}
        <nav className="adm-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`btn btn-sm${tab === t.id ? ' btn-primary' : ' btn-ghost'}`}
              onClick={() => navigate(`/city/${t.id}`)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <FormError error={city.error ?? action.error} />
        {c?.message && (
          <p className="city-message" data-testid="city-message" data-result={c.upgrade?.result}>
            {c.message}
          </p>
        )}
        {c && tab === 'shop' && <Shop city={c} busy={action.isPending} run={run} />}
        {c && tab === 'storage' && <Storage city={c} busy={action.isPending} run={run} />}
        {c && tab === 'blacksmith' && <Blacksmith city={c} busy={action.isPending} run={run} />}
      </div>
    </div>
  );
}

type Props = {
  city: CityDto;
  busy: boolean;
  run: (path: string, body: Record<string, unknown>) => void;
};

function ItemRow({
  item,
  children,
  drag,
  tip,
}: {
  item: ItemDto;
  children: React.ReactNode;
  /** Tooltip content instead of the item card (the blacksmith's comparison). */
  tip?: React.ReactNode;
  /** Pointer handlers from `useDragAndDrop` (storage). */
  drag?: React.HTMLAttributes<HTMLLIElement>;
}) {
  return (
    <li
      className="city-row"
      data-rarity={item.rarity}
      data-draggable={drag ? true : undefined}
      data-testid={`city-item-${item.defId}`}
      {...drag}
    >
      <span className="city-icon">
        <ItemIcon item={item} />
      </span>
      <span className="city-name">
        <strong className="rarity-text">
          {item.name}
          {item.quantity > 1 ? ` ×${item.quantity}` : ''}
        </strong>
        <span className="city-tip" data-wide={tip ? true : undefined}>
          {tip ?? <ItemTooltipBody item={item} />}
        </span>
      </span>
      <span className="spacer" />
      {children}
    </li>
  );
}

function Shop({ city, busy, run }: Props) {
  const bag = city.sheet.inventory;
  return (
    <div className="city-cols">
      <section className="panel">
        <div className="panel-title">
          <span>For sale</span>
        </div>
        <ul className="city-list" data-testid="shop">
          {city.shop.map((s) => (
            <li key={s.defId} className="city-row">
              <strong>{s.name}</strong>
              <span className="spacer" />
              <span className="gold-tag">{s.price} gold</span>
              <button
                className="btn btn-sm btn-primary"
                disabled={busy || !city.capital || city.sheet.gold < s.price}
                onClick={() => run('shop/buy', { defId: s.defId, qty: 1 })}
                aria-label={`Buy ${s.name}`}
              >
                Buy
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>Sell from your bag</span>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          The store buys used gear only. Materials and potions are worth more to other players.
        </p>
        <ul className="city-list">
          {bag
            .filter((i) => city.sellPrices[i.id] !== undefined)
            .map((i) => (
              <ItemRow key={i.id} item={i}>
                <span className="gold-tag">{city.sellPrices[i.id]} gold</span>
                <button
                  className="btn btn-sm"
                  disabled={busy || !city.capital}
                  onClick={() => run('shop/sell', { itemId: i.id })}
                  aria-label={`Sell ${i.name}`}
                >
                  Sell
                </button>
              </ItemRow>
            ))}
        </ul>
      </section>
    </div>
  );
}

type Place = 'bag' | 'storage';

/**
 * Storage (request #50; search, filter and drag and drop from request #52):
 * drag an item from the bag onto the storage (or back), or use the buttons.
 */
function Storage({ city, busy, run }: Props) {
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [search, setSearch] = useState('');
  const move = (itemId: string, from: Place) =>
    run(from === 'bag' ? 'storage/deposit' : 'storage/withdraw', { itemId });
  const dnd = useDragAndDrop<{ item: ItemDto; from: Place }>((d, target) => {
    if (target && target !== d.from) move(d.item.id, d.from);
  });
  const enabled = !busy && !!city.capital;
  const bag = city.sheet.inventory.filter((i) => itemMatches(i, filter, search));
  const stored = city.storage.filter((i) => itemMatches(i, filter, search));

  const column = (place: Place, title: string, list: ItemDto[], total: number) => {
    const other: Place = place === 'bag' ? 'storage' : 'bag';
    const accepting = dnd.drag?.payload.from === other;
    return (
      <section
        className="panel city-drop"
        data-drop={place}
        data-accept={accepting ? true : undefined}
        data-over={accepting && dnd.drag?.over === place ? true : undefined}
      >
        <div className="panel-title">
          <span>{title}</span>
        </div>
        {total === 0 && (
          <p className="muted small">
            {place === 'bag' ? 'Your bag is empty.' : 'Nothing stored.'}
          </p>
        )}
        {total > 0 && list.length === 0 && <p className="muted small">Nothing matches.</p>}
        <ul className="city-list" data-testid={place}>
          {list.map((i) => (
            <ItemRow key={i.id} item={i} drag={dnd.bind({ item: i, from: place }, enabled)}>
              <button
                className="btn btn-sm"
                disabled={!enabled}
                onClick={dnd.click(() => move(i.id, place))}
                aria-label={`${place === 'bag' ? 'Store' : 'Take'} ${i.name}`}
              >
                {place === 'bag' ? 'Store' : 'Take'}
              </button>
            </ItemRow>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="stack">
      <div className="row city-tools">
        <input
          className="bag-search"
          type="search"
          placeholder="Search the bag and storage…"
          aria-label="Search the bag and storage"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="bag-filters" role="tablist" aria-label="Storage filter">
          {ITEM_FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className="chip-btn"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Drag items between your bag and the storage, or use the buttons.
      </p>
      <div className="city-cols">
        {column(
          'bag',
          `Bag (${city.bag.used}/${city.bag.slots})`,
          bag,
          city.sheet.inventory.length,
        )}
        {column('storage', `Storage (${city.storage.length})`, stored, city.storage.length)}
      </div>
      {dnd.drag && (
        <DragGhost x={dnd.drag.x} y={dnd.drag.y}>
          <ItemIcon item={dnd.drag.payload.item} />
        </DragGhost>
      )}
    </div>
  );
}

function Blacksmith({ city, busy, run }: Props) {
  const [blessing, setBlessing] = useState(false);
  const weapons = [
    ...Object.values(city.sheet.equipment).filter((i): i is ItemDto => !!i),
    ...city.sheet.inventory,
  ].filter((i) => city.upgrades[i.id]);
  return (
    <section className="panel" data-testid="blacksmith">
      <div className="panel-title">
        <span>Blacksmith</span>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        +1 to +3: gold and luck. +4 to +10: also the material of the weapon&apos;s family. A failed
        upgrade <strong>destroys the weapon</strong> — unless you use a Blessing Scroll: then it
        only loses 1 level.
      </p>
      <label className="row" style={{ gap: 6 }}>
        <input
          type="checkbox"
          checked={blessing && city.blessingScrolls > 0}
          disabled={city.blessingScrolls === 0}
          onChange={(e) => setBlessing(e.target.checked)}
        />
        Use a Blessing Scroll ({city.blessingScrolls} in your bag)
      </label>
      <ul className="city-list">
        {weapons.map((w) => {
          const q = city.upgrades[w.id]!;
          const missing = q.material && q.material.have < q.material.qty;
          return (
            <ItemRow key={w.id} item={w} tip={<UpgradeCompare item={w} quote={q} />}>
              <span className="muted small">
                → +{q.toLevel} · {Math.round(q.chance * 100)}% · {q.gold} gold
                {q.material && ` · ${q.material.qty} × ${q.material.name} (${q.material.have})`}
              </span>
              <button
                className="btn btn-sm btn-primary"
                disabled={busy || !city.capital || city.sheet.gold < q.gold || !!missing}
                onClick={() =>
                  run('blacksmith/upgrade', {
                    itemId: w.id,
                    blessing: blessing && city.blessingScrolls > 0,
                  })
                }
                aria-label={`Upgrade ${w.name}`}
              >
                Upgrade
              </button>
            </ItemRow>
          );
        })}
      </ul>
    </section>
  );
}

/** One line of the comparison: value now → after, with the gain. */
function CompareRow({
  label,
  now,
  next,
  unit = '',
}: {
  label: string;
  now: string;
  next: string;
  unit?: string;
}) {
  const changed = now !== next;
  return (
    <div className="tip-row">
      <span>{label}</span>
      <b>
        {now}
        {unit} →{' '}
        <span className={changed ? 'compare-up' : undefined}>
          {next}
          {unit}
        </span>
      </b>
    </div>
  );
}

/**
 * Request #54: what the upgrade changes — the weapon now and after a
 * successful upgrade, side by side, then the full card of the result.
 */
function UpgradeCompare({ item, quote }: { item: ItemDto; quote: CityDto['upgrades'][string] }) {
  const { now, next } = quote.compare;
  const dmg = (d: { min: number; max: number }) => `${d.min}–${d.max}`;
  return (
    <div className="upgrade-compare" data-testid="upgrade-compare">
      <strong>
        {item.name} → +{quote.toLevel}
      </strong>
      <CompareRow label="Base damage" now={dmg(now.damage)} next={dmg(next.damage)} />
      <CompareRow label="Weapon abilities" now={`+${now.power}`} next={`+${next.power}`} unit="%" />
      <p className="muted small" style={{ margin: '0.3rem 0' }}>
        Success chance {Math.round(quote.chance * 100)}%. On failure the weapon breaks, unless you
        use a Blessing Scroll.
      </p>
      <div className="compare-after">
        <span className="muted small">After the upgrade</span>
        <ItemTooltipBody item={quote.preview} />
      </div>
    </div>
  );
}
