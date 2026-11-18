import type { CharacterRefDto } from '@realms/shared';
import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from '../characters/active-character';
import { CharacterToken } from '../characters/CharacterToken';
import { useLobbyActions, useLobbyOverview } from '../rifts/lobby-api';
import { useFriendActions, useFriends } from './api';

function Row({ who, children }: { who: CharacterRefDto; children?: React.ReactNode }) {
  return (
    <li className="friend-row" data-testid="friend-row">
      <CharacterToken appearance={who.appearance} size={36} title={who.name} />
      <div style={{ flex: 1 }}>
        <strong>{who.name}</strong>
        <div className="muted" style={{ fontSize: 12 }}>
          <span className="status-dot" data-status={who.online ? 'online' : 'idle'} />{' '}
          {who.online ? 'Online' : 'Offline'}
        </div>
      </div>
      {children}
    </li>
  );
}

export function FriendsPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const friends = useFriends(characterId);
  const { request, accept, remove } = useFriendActions(characterId);
  const lobby = useLobbyOverview(characterId);
  const lobbyActions = useLobbyActions(characterId);
  const [name, setName] = useState('');
  if (!characterId) return <Navigate to="/characters" replace />;

  const myLobby = lobby.data?.mine;
  const data = friends.data;

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) request.mutate(name.trim(), { onSuccess: () => setName('') });
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>Friends</h1>
        <span className="spacer" />
        <Link className="btn btn-ghost btn-sm" to="/rifts">
          Rifts
        </Link>
        <Link className="btn btn-ghost btn-sm" to="/world">
          Back to the world
        </Link>
      </header>
      <FormError
        error={request.error ?? accept.error ?? remove.error ?? lobbyActions.invite.error}
      />

      <form className="panel row" onSubmit={onAdd} style={{ marginBottom: 16 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="friend-name">Add a friend by character name</label>
          <input
            id="friend-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={request.isPending}
          style={{ alignSelf: 'flex-end' }}
        >
          Send request
        </button>
      </form>

      {!!data?.incoming.length && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-title">Requests for you</div>
          <ul className="friend-list">
            {data.incoming.map((f) => (
              <Row key={f.characterId} who={f}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => accept.mutate(f.characterId)}
                >
                  Accept
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove.mutate(f.characterId)}
                >
                  Decline
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-title">Friends ({data?.friends.length ?? 0})</div>
        {data?.friends.length ? (
          <ul className="friend-list" data-testid="friends">
            {data.friends.map((f) => (
              <Row key={f.characterId} who={f}>
                {myLobby && !myLobby.members.some((m) => m.characterId === f.characterId) && (
                  <button
                    className="btn btn-sm"
                    disabled={lobbyActions.invite.isPending}
                    onClick={() =>
                      lobbyActions.invite.mutate({
                        lobbyId: myLobby.id,
                        friendCharacterId: f.characterId,
                      })
                    }
                  >
                    Invite to lobby
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm btn-danger"
                  onClick={() => {
                    if (confirm(`Remove ${f.name} from your friends?`))
                      remove.mutate(f.characterId);
                  }}
                >
                  Remove
                </button>
              </Row>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No friends yet. Add someone by the name of their character.
          </p>
        )}
      </section>

      {!!data?.outgoing.length && (
        <section className="panel">
          <div className="panel-title">Sent requests</div>
          <ul className="friend-list">
            {data.outgoing.map((f) => (
              <Row key={f.characterId} who={f}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove.mutate(f.characterId)}
                >
                  Cancel
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
