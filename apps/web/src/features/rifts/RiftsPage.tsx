import type { LobbyVisibility } from '@realms/shared';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from '../characters/active-character';
import { useActiveRun, useRifts, useStartRun } from './api';
import { useLobbyActions, useLobbyOverview } from './lobby-api';
import './combat.css';

/** Rift list (D31: a list for now; portals on the map in phase 4). Solo or lobby. */
export function RiftsPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const rifts = useRifts();
  const active = useActiveRun(characterId);
  const overview = useLobbyOverview(characterId);
  const start = useStartRun();
  const lobby = useLobbyActions(characterId);
  const [visibility, setVisibility] = useState<LobbyVisibility>('public');
  const navigate = useNavigate();
  if (!characterId) return <Navigate to="/characters" replace />;

  const mine = overview.data?.mine;
  const busy = !!active.data || !!mine;
  const goLobby = (id: string) => navigate(`/rifts/lobbies/${id}`);

  return (
    <div className="screen-body">
      <div className="contain stack" style={{ maxWidth: '64rem' }}>
        <h1 className="page-title">Rifts</h1>
        <p className="muted" style={{ margin: 0, fontSize: '1.05rem', fontStyle: 'italic' }}>
          Rifts are portals to raids: several rooms and a boss. Go alone or in a group of up to 6 —
          difficulty does not change with the number of players.
        </p>
        <FormError error={start.error ?? rifts.error ?? lobby.create.error ?? lobby.join.error} />

        {active.data && (
          <div className="panel row banner">
            <div>
              <strong>You are inside {active.data.riftName}</strong>
              <div className="muted">
                Room {active.data.roomIndex + 1} of {active.data.rooms.length}
              </div>
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

        <div className="stack">
          {rifts.data?.map((r) => (
            <article key={r.id} className="panel rift-card" data-testid="rift-card">
              <div className="rift-portal" aria-hidden />
              <div className="stack" style={{ gap: 6, flex: 1 }}>
                <h2 className="logo" style={{ fontSize: '1.6rem' }}>
                  {r.name}
                </h2>
                <span className="muted">{r.description}</span>
                <ol className="rift-rooms">
                  {r.rooms.map((room, i) => (
                    <li key={i} data-boss={room.isBoss}>
                      {room.isBoss ? '☠ ' : ''}
                      {room.name}
                    </li>
                  ))}
                </ol>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    disabled={start.isPending || busy}
                    onClick={() =>
                      start.mutate(
                        { riftId: r.id, characterId },
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
                        { riftId: r.id, visibility },
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
          ))}
        </div>

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
