import type { CityDto, ItemDto } from '@realms/shared';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { Icon } from '../../shared/ui/Icon';
import { useActiveCharacter } from '../characters/active-character';
import { ItemIcon } from '../characters/sheet/ItemIcon';
import { ItemTooltipBody } from '../characters/sheet/ItemTooltip';
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

function ItemRow({ item, children }: { item: ItemDto; children: React.ReactNode }) {
  return (
    <li className="city-row" data-rarity={item.rarity}>
      <span className="city-icon">
        <ItemIcon item={item} />
      </span>
      <span className="city-name">
        <strong className="rarity-text">
          {item.name}
          {item.quantity > 1 ? ` ×${item.quantity}` : ''}
        </strong>
        <span className="city-tip">
          <ItemTooltipBody item={item} />
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

function Storage({ city, busy, run }: Props) {
  return (
    <div className="city-cols">
      <section className="panel">
        <div className="panel-title">
          <span>
            Bag ({city.bag.used}/{city.bag.slots})
          </span>
        </div>
        <ul className="city-list" data-testid="bag">
          {city.sheet.inventory.map((i) => (
            <ItemRow key={i.id} item={i}>
              <button
                className="btn btn-sm"
                disabled={busy || !city.capital}
                onClick={() => run('storage/deposit', { itemId: i.id })}
                aria-label={`Store ${i.name}`}
              >
                Store
              </button>
            </ItemRow>
          ))}
        </ul>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>Storage ({city.storage.length})</span>
        </div>
        {city.storage.length === 0 && <p className="muted small">Nothing stored.</p>}
        <ul className="city-list" data-testid="storage">
          {city.storage.map((i) => (
            <ItemRow key={i.id} item={i}>
              <button
                className="btn btn-sm"
                disabled={busy || !city.capital}
                onClick={() => run('storage/withdraw', { itemId: i.id })}
                aria-label={`Take ${i.name}`}
              >
                Take
              </button>
            </ItemRow>
          ))}
        </ul>
      </section>
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
            <ItemRow key={w.id} item={w}>
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
