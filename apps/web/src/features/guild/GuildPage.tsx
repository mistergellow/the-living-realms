import type { GuildViewDto, ItemDto } from '@realms/shared';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { Icon } from '../../shared/ui/Icon';
import { useActiveCharacter } from '../characters/active-character';
import { ItemIcon } from '../characters/sheet/ItemIcon';
import { ItemTooltipBody } from '../characters/sheet/ItemTooltip';
import { itemMatches } from '../characters/sheet/item-filters';
import '../city/city.css';
import { useGuild, useGuildAction } from './api';
import { GuildEmblem } from './GuildEmblem';
import './guild.css';

type Run = (path: string, body?: Record<string, unknown>, method?: 'POST' | 'PATCH') => void;

/** Guilds (request #57): found or join one; members, bank, land and storage. */
export function GuildPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const guild = useGuild(characterId);
  const action = useGuildAction(characterId);
  if (!characterId) return <Navigate to="/" replace />;
  const v = guild.data;
  const run: Run = (path, body, method) => action.mutate({ path, body, method });
  return (
    <div className="screen-body">
      <div
        className={`contain stack guild${guild.data && !guild.data.guild ? ' narrow' : ''}`}
        data-testid="guild"
      >
        <FormError error={guild.error ?? action.error} />
        {v?.message && (
          <p className="city-message" data-testid="guild-message">
            {v.message}
          </p>
        )}
        {v && !v.guild && <NoGuild v={v} run={run} busy={action.isPending} />}
        {v?.guild && <MyGuild v={v} run={run} busy={action.isPending} />}
      </div>
    </div>
  );
}

type Props = { v: GuildViewDto; run: Run; busy: boolean };

function EmblemPicker({
  v,
  icon,
  color,
  onIcon,
  onColor,
}: {
  v: GuildViewDto;
  icon: string;
  color: string;
  onIcon: (i: string) => void;
  onColor: (c: string) => void;
}) {
  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <div className="emblem-grid" role="radiogroup" aria-label="Guild icon">
        {v.rules.icons.map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={icon === i}
            aria-label={i}
            className="emblem-choice"
            onClick={() => onIcon(i)}
          >
            <GuildEmblem icon={i} color={color} size={40} />
          </button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label="Guild colour">
        {v.rules.colors.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            className="swatch"
            style={{ background: c }}
            onClick={() => onColor(c)}
          />
        ))}
      </div>
    </div>
  );
}

function NoGuild({ v, run, busy }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(v.rules.icons[0]!);
  const [color, setColor] = useState(v.rules.colors[0]!);
  return (
    <>
      <h1 className="page-title" style={{ margin: 0 }}>
        Guilds
      </h1>
      {v.invites.length > 0 && (
        <section className="panel" data-testid="guild-invites">
          <div className="panel-title">
            <span>Invitations</span>
          </div>
          <ul className="city-list">
            {v.invites.map((i) => (
              <li key={i.guildId} className="city-row">
                <GuildEmblem icon={i.icon} color={i.color} size={32} />
                <strong>{i.guildName}</strong>
                <span className="muted small">
                  {i.members} members{i.invitedBy ? ` · invited by ${i.invitedBy}` : ''}
                </span>
                <span className="spacer" />
                <button
                  className="btn btn-sm btn-primary"
                  disabled={busy}
                  onClick={() => run(`/invites/${i.guildId}/accept`)}
                >
                  Join
                </button>
                <button
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => run(`/invites/${i.guildId}/decline`)}
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="panel stack" data-testid="guild-found">
        <div className="panel-title">
          <span>Found a guild</span>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Up to {v.rules.maxMembers} members. Founding costs {v.rules.createCost} gold (you have{' '}
          {v.gold}). The guild earns reputation when its members win Rifts together.
        </p>
        <div className="row" style={{ gap: '0.75rem', alignItems: 'center' }}>
          <GuildEmblem icon={icon} color={color} size={64} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Guild name"
            aria-label="Guild name"
            maxLength={24}
          />
        </div>
        <EmblemPicker v={v} icon={icon} color={color} onIcon={setIcon} onColor={setColor} />
        <div>
          <button
            className="btn btn-primary"
            disabled={busy || name.trim().length < 3 || v.gold < v.rules.createCost}
            onClick={() => run('', { name, icon, color })}
          >
            Found · {v.rules.createCost} gold
          </button>
        </div>
      </section>
    </>
  );
}

function MyGuild({ v, run, busy }: Props) {
  const g = v.guild!;
  const leader = v.role === 'leader';
  const [invite, setInvite] = useState('');
  const [gold, setGold] = useState(100);
  const [editing, setEditing] = useState(false);
  return (
    <>
      <header className="panel guild-head" style={{ ['--emblem' as string]: g.color }}>
        <GuildEmblem icon={g.icon} color={g.color} size={72} />
        <div className="stack" style={{ gap: '0.2rem' }}>
          <h1 className="page-title" style={{ margin: 0 }} data-testid="guild-name">
            {g.name}
          </h1>
          <span className="muted">
            <Icon name="star" /> {g.reputation} reputation · {g.members.length}/{g.maxMembers}{' '}
            members · <Icon name="coin" /> {g.gold} gold in the bank
            {g.land ? ` · land at (${g.land.q}, ${g.land.r})` : ''}
          </span>
        </div>
        <span className="spacer" />
        {leader && (
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(!editing)}>
            Emblem
          </button>
        )}
        <button
          className="btn btn-sm"
          disabled={busy}
          onClick={() => {
            if (confirm(`Leave ${g.name}?`)) run('/leave');
          }}
        >
          Leave
        </button>
      </header>
      {leader && editing && (
        <section className="panel">
          <EmblemPicker
            v={v}
            icon={g.icon}
            color={g.color}
            onIcon={(icon) => run('', { icon }, 'PATCH')}
            onColor={(color) => run('', { color }, 'PATCH')}
          />
        </section>
      )}

      <div className="city-cols">
        <section className="panel stack" data-testid="guild-members">
          <div className="panel-title">
            <span>
              Members ({g.members.length}/{g.maxMembers})
            </span>
          </div>
          <ul className="city-list">
            {g.members.map((m) => (
              <li key={m.characterId} className="city-row">
                <strong>{m.name}</strong>
                {m.role === 'leader' && <span className="guild-role">Leader</span>}
                <span className="spacer" />
                <Link className="small" to={`/professions/inspect/${encodeURIComponent(m.name)}`}>
                  Professions
                </Link>
                {leader && m.role !== 'leader' && (
                  <>
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Make ${m.name} the leader?`))
                          run('/leader', { characterId: m.characterId });
                      }}
                    >
                      Make leader
                    </button>
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Remove ${m.name} from the guild?`))
                          run('/kick', { characterId: m.characterId });
                      }}
                      aria-label={`Kick ${m.name}`}
                    >
                      Kick
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {leader && (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                if (invite.trim()) run('/invites', { name: invite.trim() });
                setInvite('');
              }}
            >
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                placeholder="Character name"
                aria-label="Invite a character"
              />
              <button className="btn btn-sm btn-primary" disabled={busy || !invite.trim()}>
                Invite
              </button>
            </form>
          )}
          {leader && g.invited.length > 0 && (
            <p className="muted small" style={{ margin: 0 }}>
              Invited: {g.invited.map((i) => i.name).join(', ')}
            </p>
          )}
        </section>

        <section className="panel stack">
          <div className="panel-title">
            <span>Bank and land</span>
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              run('/bank/deposit', { amount: gold });
            }}
          >
            <input
              type="number"
              min={1}
              value={gold}
              onChange={(e) => setGold(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
              aria-label="Gold to give"
              style={{ width: '7rem' }}
            />
            <button className="btn btn-sm" disabled={busy || v.gold < gold}>
              Give gold (you have {v.gold})
            </button>
          </form>
          {g.land ? (
            <p style={{ margin: 0 }}>
              Your guild owns the land at ({g.land.q}, {g.land.r}). Guild buildings come later.
            </p>
          ) : (
            <div className="stack" style={{ gap: '0.3rem' }}>
              <p className="muted small" style={{ margin: 0 }}>
                The leader can buy the hex they stand on for {v.rules.landCost} gold from the bank.
              </p>
              {leader && (
                <div>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={busy || !!v.landHere || g.gold < v.rules.landCost}
                    onClick={() => run('/land')}
                    title={v.landHere ?? undefined}
                  >
                    Buy this land · {v.rules.landCost} gold
                  </button>
                  {v.landHere && <span className="muted small"> · {v.landHere}</span>}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <GuildStorage v={v} run={run} busy={busy} />
    </>
  );
}

function Row({ item, children }: { item: ItemDto; children: React.ReactNode }) {
  return (
    <li className="city-row" data-rarity={item.rarity} data-testid={`guild-item-${item.defId}`}>
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

function GuildStorage({ v, run, busy }: Props) {
  const g = v.guild!;
  const [search, setSearch] = useState('');
  if (!v.storageHere)
    return (
      <section className="panel">
        <div className="panel-title">
          <span>Guild storage</span>
        </div>
        <p className="muted small">
          Reach the guild storage from a capital{g.land ? ' or from your guild’s land' : ''}.
        </p>
      </section>
    );
  const bag = v.bag.filter((i) => itemMatches(i, 'all', search));
  const stored = g.storage.filter((i) => itemMatches(i, 'all', search));
  return (
    <div className="stack">
      <input
        className="bag-search"
        type="search"
        placeholder="Search…"
        aria-label="Search the bag and guild storage"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: '24rem' }}
      />
      <div className="city-cols">
        <section className="panel">
          <div className="panel-title">
            <span>Your bag</span>
          </div>
          <ul className="city-list" data-testid="guild-bag">
            {bag.map((i) => (
              <Row key={i.id} item={i}>
                <button
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => run('/storage/deposit', { itemId: i.id })}
                  aria-label={`Give ${i.name}`}
                >
                  Give
                </button>
              </Row>
            ))}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span>
              Guild storage ({g.storage.length}/{g.storageSlots})
            </span>
          </div>
          {g.storage.length === 0 && <p className="muted small">Nothing stored yet.</p>}
          <ul className="city-list" data-testid="guild-storage">
            {stored.map((i) => (
              <Row key={i.id} item={i}>
                <button
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => run('/storage/withdraw', { itemId: i.id })}
                  aria-label={`Take ${i.name}`}
                >
                  Take
                </button>
              </Row>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
