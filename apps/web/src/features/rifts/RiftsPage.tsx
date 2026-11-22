import { AP_RULES, hexDistance } from '@realms/game-core';
import { PVP_ARENA_ID, type LobbyVisibility } from '@realms/shared';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from '../characters/active-character';
import { useActiveRun, useRifts, useStartRun } from './api';
import { useLobbyActions, useLobbyOverview } from './lobby-api';
import { useWorldStore } from '../world/world-store';
import './combat.css';

/** Rifts (request #43): the entrance on your hex (solo or lobby) and the list of entrances. */
export function RiftsPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const rifts = useRifts();
  const active = useActiveRun(characterId);
  const overview = useLobbyOverview(characterId);
  const start = useStartRun();
  const lobby = useLobbyActions(characterId);
  const [visibility, setVisibility] = useState<LobbyVisibility>('public');
  const navigate = useNavigate();
  const pos = useWorldStore((st) => st.self?.position ?? null);
  if (!characterId) return <Navigate to="/" replace />;

  const mine = overview.data?.mine;
  const busy = !!active.data || !!mine;
  const goLobby = (id: string) => navigate(`/rifts/lobbies/${id}`);

  return (
    <div className="screen-body">
      <div className="contain stack">
        <h1 className="page-title">Rifts</h1>
        <p className="muted" style={{ margin: 0, fontSize: '1.05rem', fontStyle: 'italic' }}>
          Rifts are dungeons with branching paths: choose your way, avoid or pick fights, rest,
          solve events and find secret rooms before the boss. Each opens on a hex of the Riftlands;
          deeper ones are harder and start with more Threat. Go alone or in a group of up to 4.
        </p>
        <FormError error={start.error ?? rifts.error ?? lobby.create.error ?? lobby.join.error} />

        {active.data && (
          <div className="panel row banner">
            <div>
              <strong>You are inside {active.data.riftName}</strong>
              <div className="muted">{active.data.roomsVisited} rooms explored</div>
            </div>
            <span className="spacer" />
            <Link className="btn btn-primary" to={`/rifts/runs/${active.data.id}`}>
              Resume
            </Link>
          </div>
        )}
        {mine && (
          <div className="panel row banner" data-testid="my-lobby">
            <div>
              <strong>Your lobby: {mine.riftName}</strong>
              <div className="muted">
                {mine.members.length}/{mine.maxMembers} players · {mine.visibility}
              </div>
            </div>
            <span className="spacer" />
            <Link className="btn btn-primary" to={`/rifts/lobbies/${mine.id}`}>
              Open lobby
            </Link>
          </div>
        )}

        {!!overview.data?.invites.length && (
          <section className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-title">Invitations</div>
            <ul className="friend-list" data-testid="invites">
              {overview.data.invites.map((i) => (
                <li key={i.lobbyId} className="friend-row">
                  <span style={{ flex: 1 }}>
                    <strong>{i.from}</strong> invited you to <strong>{i.riftName}</strong>{' '}
                    <span className="muted">({i.memberCount} players)</span>
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busy || lobby.join.isPending}
                    onClick={() =>
                      lobby.join.mutate(i.lobbyId, { onSuccess: (l) => goLobby(l.id) })
                    }
                  >
                    Join
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => lobby.leave.mutate(i.lobbyId)}
                  >
                    Decline
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(() => {
          const here = rifts.data?.find(
            (r) => r.site && pos && r.site.q === pos.q && r.site.r === pos.r,
          );
          if (!here)
            return (
              <section className="panel" data-testid="no-rift-here">
                <strong>There is no Rift on this hex.</strong>
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  Rifts open on certain hexes of the Riftlands; the closer to its heart, the harder
                  they are. Travel to one on the <Link to="/world">world map</Link>.
                </p>
              </section>
            );
          return (
            <article className="panel rift-card" data-testid="rift-card">
              <div className="rift-portal" aria-hidden />
              <div className="stack" style={{ gap: 6, flex: 1 }}>
                <h2 className="logo" style={{ fontSize: '1.6rem' }}>
                  {here.name}
                </h2>
                <span className="muted">{here.description}</span>
                <span className="muted small">
                  Tier {here.tier} · {here.depth} rooms on any path · boss:{' '}
                  <strong>{here.bossName}</strong>
                </span>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    disabled={start.isPending || busy}
                    onClick={() =>
                      start.mutate(
                        { riftId: here.id, characterId },
                        { onSuccess: (run) => navigate(`/rifts/runs/${run.id}`) },
                      )
                    }
                  >
                    Enter solo
                  </button>
                  <button
                    className="btn"
                    disabled={lobby.create.isPending || busy}
                    onClick={() =>
                      lobby.create.mutate(
                        { riftId: here.id, visibility },
                        { onSuccess: (l) => goLobby(l.id) },
                      )
                    }
                  >
                    Create lobby
                  </button>
                  <label className="row muted" style={{ gap: 6, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={visibility === 'private'}
                      onChange={(e) => setVisibility(e.target.checked ? 'private' : 'public')}
                    />
                    Private (invite only)
                  </label>
                </div>
              </div>
            </article>
          );
        })()}

        <section className="panel">
          <div className="panel-title">
            <span>Rift entrances</span>
          </div>
          <ul className="rift-sites" data-testid="rift-sites">
            {[...(rifts.data ?? [])]
              .filter((r) => r.site)
              .sort((a, b) => (pos ? hexDistance(pos, a.site!) - hexDistance(pos, b.site!) : 0))
              .map((r) => (
                <li key={r.id}>
                  <span className="hex-tag rift">Tier {r.tier}</span>
                  <span style={{ flex: 1 }}>{r.name}</span>
                  {pos && (
                    <span className="muted">
                      {hexDistance(pos, r.site!)} hexes ·{' '}
                      {hexDistance(pos, r.site!) * AP_RULES.moveCostPerHex} AP
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </section>

        <article className="panel rift-card boss-card" data-testid="world-boss-card">
          <div className="stack" style={{ gap: 6, flex: 1 }}>
            <h2 className="logo" style={{ fontSize: '1.4rem' }}>
              World boss
            </h2>
            <span className="muted">
              The season&apos;s boss roams the Riftlands with a huge shared life. Find it, fight it
              with your party and climb the damage leaderboard.
            </span>
            <div className="row">
              <Link className="btn" to="/world-boss">
                See the world boss
              </Link>
            </div>
          </div>
        </article>

        <article className="panel rift-card" data-testid="pvp-card">
          <div className="stack" style={{ gap: 6, flex: 1 }}>
            <h2 className="logo" style={{ fontSize: '1.4rem' }}>
              PvP Arena (test)
            </h2>
            <span className="muted">
              Two teams of players, same combat rules: plan, then actions alternate by team
              initiative. No rewards and no equipment damage while it is a test.
            </span>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn"
                disabled={lobby.create.isPending || busy}
                onClick={() =>
                  lobby.create.mutate(
                    { riftId: PVP_ARENA_ID, visibility },
                    { onSuccess: (l) => goLobby(l.id) },
                  )
                }
              >
                Create PvP lobby
              </button>
            </div>
          </div>
        </article>

        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-title">Public lobbies</div>
          {overview.data?.publicLobbies.length ? (
            <ul className="friend-list" data-testid="public-lobbies">
              {overview.data.publicLobbies.map((l) => (
                <li key={l.id} className="friend-row">
                  <span style={{ flex: 1 }}>
                    <strong>{l.riftName}</strong>{' '}
                    <span className="muted">· led by {l.leaderName}</span>
                  </span>
                  <span className="muted">
                    {l.memberCount}/{l.maxMembers}
                  </span>
                  <button
                    className="btn btn-sm"
                    disabled={busy || lobby.join.isPending}
                    onClick={() => lobby.join.mutate(l.id, { onSuccess: (x) => goLobby(x.id) })}
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No open lobbies right now. Create one, or invite friends.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
