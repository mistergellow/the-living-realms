import type { CityDto, ItemDto } from '@realms/shared';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { Icon } from '../../shared/ui/Icon';
import { useActiveCharacter } from '../characters/active-character';
import { ItemIcon } from '../characters/sheet/ItemIcon';
import { ItemTooltipBody } from '../characters/sheet/ItemTooltip';
import { DragGhost, Tooltip, useDragAndDrop, useHover } from '../characters/sheet/drag';
import {
  ItemGrid,
  parseCellKey,
  SplitDialog,
  type Place as GridPlace,
} from '../characters/sheet/ItemGrid';
import { ITEM_FILTERS, itemMatches, type ItemFilter } from '../characters/sheet/item-filters';
import '../characters/sheet/sheet.css';
import { useCity, useCityAction, useInventoryActions, useMarket, useMarketAction } from './api';
import './city.css';

type Tab = 'shop' | 'market' | 'storage' | 'blacksmith';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'shop', label: 'General store' },
  { id: 'market', label: 'Market' },
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
        {c && tab === 'market' && <Market />}
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

/**
 * General store (request #50; grid with search and filters, request #59):
 * the offers and your bag are grids of item tiles. Click a tile to pick it,
 * then buy or sell; double-click buys or sells one at once.
 */
function Shop({ city, busy, run }: Props) {
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [search, setSearch] = useState('');
  const [pick, setPick] = useState<{ kind: 'buy' | 'sell'; id: string } | null>(null);
  const [qty, setQty] = useState(1);
  const tip = useHover<ItemDto>();
  const offers = city.shop.map((s, i) => ({ ...s, item: { ...s.item, slot: i } }));
  const dim = (i: ItemDto) => !itemMatches(i, filter, search);
  const offer = pick?.kind === 'buy' ? offers.find((o) => o.item.id === pick.id) : undefined;
  const owned =
    pick?.kind === 'sell' ? city.sheet.inventory.find((i) => i.id === pick.id) : undefined;
  const sellPrice = owned ? city.sellPrices[owned.id] : undefined;
  const n = Math.max(1, Math.floor(qty) || 1);
  const buy = (defId: string, count: number) => run('shop/buy', { defId, qty: count });
  const sell = (itemId: string) => run('shop/sell', { itemId });
  const choose = (kind: 'buy' | 'sell', item: ItemDto) => {
    setPick({ kind, id: item.id });
    setQty(1);
  };
  const hovered = tip.hover?.value;
  const noop = () => ({});
  return (
    <div className="storage-tab">
      <div className="grid-tools">
        <input
          className="bag-search"
          type="search"
          placeholder="Search the store and your bag…"
          aria-label="Search the store"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="bag-filters" role="tablist" aria-label="Store filter">
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
        <span className="muted small">Click to pick · double-click to buy or sell one</span>
      </div>
      <div className="storage-cols">
        <section className="panel storage-pane" data-testid="shop">
          <div className="panel-title">
            <span>For sale</span>
          </div>
          <div className="pane-scroll">
            <ItemGrid
              place="storage"
              items={offers.map((o) => o.item)}
              size={offers.length}
              cols={10}
              over={null}
              dimmed={dim}
              bind={noop}
              tip={(item) => tip.props(item)}
              selected={offer?.item.id ?? null}
              onClick={(item) => choose('buy', item)}
              onDoubleClick={(item) => {
                const o = offers.find((x) => x.item.id === item.id);
                if (o && city.capital && city.sheet.gold >= o.price) buy(o.defId, 1);
              }}
              badge={(item) => (
                <span className="price-tag">
                  {offers.find((o) => o.item.id === item.id)?.price}
                </span>
              )}
              testId="shop-grid"
            />
          </div>
          <div className="pick-bar">
            {offer ? (
              <>
                <strong className="rarity-text" data-rarity={offer.item.rarity}>
                  {offer.name}
                </strong>
                <span className="gold-tag">{offer.price * n} gold</span>
                {offer.item.quantity >= 1 &&
                  (offer.item.kind === 'material' || offer.item.kind === 'consumable') && (
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      aria-label="Quantity"
                      style={{ width: '4.5rem' }}
                    />
                  )}
                <span className="spacer" />
                <button
                  className="btn btn-sm btn-primary"
                  disabled={busy || !city.capital || city.sheet.gold < offer.price * n}
                  onClick={() => buy(offer.defId, n)}
                  aria-label={`Buy ${offer.name}`}
                >
                  Buy
                </button>
              </>
            ) : (
              <span className="muted small">Pick something to buy.</span>
            )}
          </div>
        </section>
        <section className="panel storage-pane bag-pane">
          <div className="panel-title">
            <span>Sell from your bag</span>
          </div>
          <div className="pane-scroll">
            <ItemGrid
              place="bag"
              items={city.sheet.inventory}
              size={city.bag.slots}
              cols={5}
              over={null}
              dimmed={(i) => dim(i) || city.sellPrices[i.id] === undefined}
              bind={noop}
              tip={(item) => tip.props(item)}
              selected={owned?.id ?? null}
              onClick={(item) => choose('sell', item)}
              onDoubleClick={(item) => {
                if (city.capital && city.sellPrices[item.id] !== undefined) sell(item.id);
              }}
              badge={(item) =>
                city.sellPrices[item.id] !== undefined ? (
                  <span className="price-tag">{city.sellPrices[item.id]}</span>
                ) : null
              }
              testId="sell-grid"
            />
          </div>
          <div className="pick-bar">
            {owned ? (
              sellPrice !== undefined ? (
                <>
                  <strong className="rarity-text" data-rarity={owned.rarity}>
                    {owned.name}
                  </strong>
                  <span className="gold-tag">{sellPrice} gold</span>
                  <span className="spacer" />
                  <button
                    className="btn btn-sm"
                    disabled={busy || !city.capital}
                    onClick={() => {
                      sell(owned.id);
                      setPick(null);
                    }}
                    aria-label={`Sell ${owned.name}`}
                  >
                    Sell
                  </button>
                </>
              ) : (
                <span className="muted small">
                  The store does not buy {owned.name}. Materials and potions are worth more to other
                  players.
                </span>
              )
            ) : (
              <span className="muted small">The store buys used gear only.</span>
            )}
          </div>
        </section>
      </div>
      {hovered && tip.hover && (
        <Tooltip anchor={tip.hover.rect}>
          <ItemTooltipBody item={hovered} />
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Storage (requests #50, #52, #59): two grids of fixed positions — the bag
 * (20) and the storage (80). Drag between them, stack on the same item,
 * Shift + drop to split, Sort each grid. Search dims what does not match.
 */
function Storage({ city, busy }: Props) {
  const characterId = useActiveCharacter((s) => s.characterId);
  const inv = useInventoryActions(characterId);
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [search, setSearch] = useState('');
  const [split, setSplit] = useState<{ item: ItemDto; to: GridPlace; slot: number } | null>(null);
  const tip = useHover<ItemDto>();
  const working = busy || inv.move.isPending || inv.sort.isPending || !city.capital;
  const dnd = useDragAndDrop<{ item: ItemDto; from: GridPlace }>((d, target, mods) => {
    tip.clear();
    const cell = parseCellKey(target);
    if (!cell || working) return;
    if (cell.place === d.from && cell.slot === d.item.slot) return;
    if (mods.shift && d.item.quantity > 1)
      setSplit({ item: d.item, to: cell.place, slot: cell.slot });
    else inv.move.mutate({ itemId: d.item.id, to: cell.place, slot: cell.slot });
  });
  const dim = (i: ItemDto) => !itemMatches(i, filter, search);
  const hovered = tip.hover
    ? [...city.sheet.inventory, ...city.storage].find((i) => i.id === tip.hover!.value.id)
    : undefined;
  const grid = (place: GridPlace, items: ItemDto[], size: number, cols: number) => (
    <ItemGrid
      place={place}
      items={items}
      size={size}
      cols={cols}
      over={dnd.drag?.over ?? null}
      dimmed={dim}
      bind={(item) => dnd.bind({ item, from: place }, !working)}
      tip={(item) => tip.props(item)}
      testId={place}
    />
  );
  return (
    <div className="storage-tab">
      <div className="grid-tools">
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
        <span className="muted small">
          Drag between the grids · same item stacks · Shift + drop splits
        </span>
      </div>
      <FormError error={inv.move.error ?? inv.sort.error} />
      <div className="storage-cols">
        <section className="panel storage-pane">
          <div className="panel-title">
            <span>
              Storage ({city.storage.length}/{city.storageSlots})
            </span>
          </div>
          <div className="pane-scroll">{grid('storage', city.storage, city.storageSlots, 12)}</div>
          <button
            className="btn btn-sm"
            disabled={working}
            onClick={() => inv.sort.mutate('storage')}
            aria-label="Sort the storage"
          >
            Sort
          </button>
        </section>
        <section className="panel storage-pane bag-pane">
          <div className="panel-title">
            <span>
              Bag ({city.bag.used}/{city.bag.slots})
            </span>
          </div>
          <div className="pane-scroll">{grid('bag', city.sheet.inventory, city.bag.slots, 5)}</div>
          <button
            className="btn btn-sm"
            disabled={working}
            onClick={() => inv.sort.mutate('bag')}
            aria-label="Sort the bag"
          >
            Sort
          </button>
        </section>
      </div>
      {hovered && tip.hover && !dnd.drag && (
        <Tooltip anchor={tip.hover.rect}>
          <ItemTooltipBody item={hovered} />
        </Tooltip>
      )}
      {dnd.drag && (
        <DragGhost x={dnd.drag.x} y={dnd.drag.y}>
          <ItemIcon item={dnd.drag.payload.item} />
        </DragGhost>
      )}
      {split && (
        <SplitDialog
          item={split.item}
          onCancel={() => setSplit(null)}
          onConfirm={(qty) => {
            inv.move.mutate({ itemId: split.item.id, to: split.to, slot: split.slot, qty });
            setSplit(null);
          }}
        />
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

/**
 * Player market (request #63): what other players sell in this city, and
 * your own items for sale. Pick an item from your bag, set a price, and it
 * stays on sale here until someone buys it (you get the gold) or you take it
 * back. At most 20 items for sale at once.
 */
function Market() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const market = useMarket(characterId);
  const action = useMarketAction(characterId);
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [search, setSearch] = useState('');
  const [buyId, setBuyId] = useState<string | null>(null);
  const [sellId, setSellId] = useState<string | null>(null);
  const [price, setPrice] = useState(10);
  const tip = useHover<ItemDto>();
  const m = market.data;
  if (!m) return <FormError error={market.error} />;
  const busy = action.isPending || !m.capital;
  const listings = m.listings.map((l, i) => ({ ...l, item: { ...l.item, slot: i } }));
  const listing = listings.find((l) => l.id === buyId);
  const toSell = m.bag.find((i) => i.id === sellId);
  const dim = (i: ItemDto) => !itemMatches(i, filter, search);
  const run = (path: 'list' | 'buy' | 'cancel', body: Record<string, unknown>) =>
    action.mutate({ path, body });
  const noop = () => ({});
  const hovered = tip.hover?.value;
  return (
    <div className="storage-tab" data-testid="market">
      <div className="grid-tools">
        <input
          className="bag-search"
          type="search"
          placeholder="Search the market…"
          aria-label="Search the market"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="bag-filters" role="tablist" aria-label="Market filter">
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
        <span className="muted small">
          Items for sale here are only sold in {m.capital ?? 'this city'}.
        </span>
      </div>
      <FormError error={action.error} />
      {m.message && (
        <p className="city-message" data-testid="market-message">
          {m.message}
        </p>
      )}
      <div className="storage-cols">
        <section className="panel storage-pane">
          <div className="panel-title">
            <span>For sale in {m.capital ?? 'the city'}</span>
          </div>
          <div className="pane-scroll">
            {listings.length === 0 ? (
              <p className="muted small">Nobody is selling anything here yet.</p>
            ) : (
              <ItemGrid
                place="storage"
                items={listings.map((l) => l.item)}
                size={listings.length}
                cols={10}
                over={null}
                dimmed={dim}
                bind={noop}
                tip={(item) => tip.props(item)}
                selected={listing?.item.id ?? null}
                onClick={(item) =>
                  setBuyId(listings.find((l) => l.item.id === item.id)?.id ?? null)
                }
                badge={(item) => (
                  <span className="price-tag">
                    {listings.find((l) => l.item.id === item.id)?.price}
                  </span>
                )}
                testId="market-grid"
              />
            )}
          </div>
          <div className="pick-bar">
            {listing ? (
              <>
                <strong className="rarity-text" data-rarity={listing.item.rarity}>
                  {listing.item.name}
                  {listing.item.quantity > 1 ? ` ×${listing.item.quantity}` : ''}
                </strong>
                <span className="muted small">by {listing.sellerName}</span>
                <span className="gold-tag">{listing.price} gold</span>
                <span className="spacer" />
                {listing.mine ? (
                  <button
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => run('cancel', { listingId: listing.id })}
                  >
                    Take back
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={busy || m.gold < listing.price}
                    onClick={() => run('buy', { listingId: listing.id })}
                    aria-label={`Buy ${listing.item.name}`}
                  >
                    Buy
                  </button>
                )}
              </>
            ) : (
              <span className="muted small">Pick an item to see its price and seller.</span>
            )}
          </div>
        </section>
        <section className="panel storage-pane bag-pane">
          <div className="panel-title">
            <span>
              Sell · {m.mine.length}/{m.maxListings} for sale
            </span>
          </div>
          <div className="pane-scroll">
            <ItemGrid
              place="bag"
              items={m.bag}
              size={20}
              cols={5}
              over={null}
              dimmed={dim}
              bind={noop}
              tip={(item) => tip.props(item)}
              selected={toSell?.id ?? null}
              onClick={(item) => setSellId(item.id)}
              testId="market-bag"
            />
            {m.mine.length > 0 && (
              <ul className="city-list" style={{ marginTop: '0.75rem' }} data-testid="my-listings">
                {m.mine.map((l) => (
                  <li key={l.id} className="city-row" data-rarity={l.item.rarity}>
                    <strong className="rarity-text">
                      {l.item.name}
                      {l.item.quantity > 1 ? ` ×${l.item.quantity}` : ''}
                    </strong>
                    <span className="muted small">{l.city}</span>
                    <span className="spacer" />
                    <span className="gold-tag">{l.price} gold</span>
                    {l.city === m.capital && (
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => run('cancel', { listingId: l.id })}
                        aria-label={`Take back ${l.item.name}`}
                      >
                        Take back
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form
            className="pick-bar"
            onSubmit={(e) => {
              e.preventDefault();
              if (toSell) {
                run('list', { itemId: toSell.id, price });
                setSellId(null);
              }
            }}
          >
            {toSell ? (
              <>
                <strong className="rarity-text" data-rarity={toSell.rarity}>
                  {toSell.name}
                </strong>
                <span className="spacer" />
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                  aria-label="Price in gold"
                  style={{ width: '6rem' }}
                />
                <button
                  className="btn btn-sm btn-primary"
                  disabled={busy || m.mine.length >= m.maxListings}
                >
                  Put up for sale
                </button>
              </>
            ) : (
              <span className="muted small">Pick an item from your bag to sell it here.</span>
            )}
          </form>
        </section>
      </div>
      {hovered && tip.hover && (
        <Tooltip anchor={tip.hover.rect}>
          <ItemTooltipBody item={hovered} />
        </Tooltip>
      )}
    </div>
  );
}
