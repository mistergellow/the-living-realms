import type { LobbyMemberDto } from '@realms/shared';
import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { Screen } from '../../shared/ui/Screen';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { useActiveCharacter } from '../characters/active-character';
import { CharacterToken } from '../characters/CharacterToken';
import { useFriends } from '../social/api';
import { useLobby, useLobbyActions } from './lobby-api';
import './combat.css';

/** Party formation as in combat (D38): back, mid and front columns × 2 lines. */
const COLUMNS = [
  { label: 'Back', slots: [4, 5] },
  { label: 'Mid', slots: [2, 3] },
  { label: 'Front', slots: [0, 1] },
];

export function LobbyPage() {
  const { lobbyId = '' } = useParams();
  const characterId = useActiveCharacter((s) => s.characterId);
  const lobby = useLobby(lobbyId, characterId);
  const actions = useLobbyActions(characterId);
  const friends = useFriends(characterId);
  const navigate = useNavigate();
  const runId = lobby.data?.runId;

  // When the leader starts, everyone goes to the fight.
  useEffect(() => {
    if (runId) navigate(`/rifts/runs/${runId}`, { replace: true });
  }, [runId, navigate]);

  if (!characterId) return <Navigate to="/characters" replace />;
  if (lobby.isPending) return <FullPageMessage>Loading lobby…</FullPageMessage>;
  if (lobby.isError || !lobby.data) {
    return (
      <FullPageMessage>
        You are not in this lobby. <Link to="/rifts">Back to Rifts</Link>
      </FullPageMessage>
    );
  }
  const l = lobby.data;
  const me = l.members.find((m) => m.characterId === characterId);
  const isLeader = l.leaderCharacterId === characterId;
  const others = l.members.filter((m) => !m.isLeader);
  const allReady = others.every((m) => m.ready);
  const busy = Object.values(actions).some((m) => m.isPending);
  const err = Object.values(actions).find((m) => m.error)?.error;
  const inviteable = (friends.data?.friends ?? []).filter(
    (f) => !l.members.some((m) => m.characterId === f.characterId),
  );

  const cell = (slot: number) => {
    const m: LobbyMemberDto | undefined = l.members.find((x) => x.slot === slot);
    if (!m)
      return (
        <button
          key={slot}
          className="lobby-slot empty"
          disabled={busy}
          onClick={() => actions.slot.mutate({ lobbyId: l.id, slot })}
          aria-label={`Move to slot ${slot + 1}`}
        >
          Move here
        </button>
      );
    const mine = m.characterId === characterId;
    return (
      <div key={slot} className="lobby-slot" data-mine={mine} data-testid="lobby-member">
        <CharacterAvatar appearance={m.appearance} size={96} animated={m.ready} />
        <div className="stack" style={{ gap: 2 }}>
          <strong>
            {m.name} {m.isLeader && <span title="Leader">♛</span>}
          </strong>
          <span className="field-hint">{m.build}</span>
          <span className={m.ready || m.isLeader ? 'ready-tag on' : 'ready-tag'}>
            {m.isLeader ? 'Leader' : m.ready ? 'Ready' : 'Not ready'}
          </span>
          {isLeader && !mine && (
            <button
              className="btn btn-ghost btn-sm btn-danger"
              onClick={(e) => {
                e.stopPropagation();
                actions.kick.mutate({ lobbyId: l.id, targetCharacterId: m.characterId });
              }}
            >
              Kick
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Screen>
      <header className="topbar">
        <div>
          <h1>{l.riftName}</h1>
          <span className="muted">
            {l.visibility === 'public' ? 'Public lobby' : 'Private lobby (invite only)'} ·{' '}
            {l.members.length}/{l.maxMembers} players · {l.rooms.length} rooms
          </span>
        </div>
        <span className="spacer" />
        <button
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => actions.leave.mutate(l.id, { onSuccess: () => navigate('/rifts') })}
        >
          Leave lobby
        </button>
      </header>
      <main className="screen-body">
        <div className="contain stack" style={{ maxWidth: '64rem' }}>
          <FormError error={err} />
          <p className="muted" style={{ marginTop: -8 }}>
            Click an empty slot to move there, or a taken one to swap. Difficulty does not change
            with the number of players.
          </p>

          <section className="panel lobby-formation" data-testid="lobby-formation">
            {COLUMNS.map((c) => (
              <div key={c.label} className="lobby-column">
                <div className="panel-title">{c.label}</div>
                {c.slots.map((slot) => {
                  const occupant = l.members.find((m) => m.slot === slot);
                  if (occupant && occupant.characterId !== characterId)
                    return (
                      <div
                        key={slot}
                        role="button"
                        tabIndex={0}
                        onClick={() => !busy && actions.slot.mutate({ lobbyId: l.id, slot })}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && actions.slot.mutate({ lobbyId: l.id, slot })
                        }
                        title="Swap places"
                      >
                        {cell(slot)}
                      </div>
                    );
                  return cell(slot);
                })}
              </div>
            ))}
            <div className="lobby-enemy-side" aria-hidden>
              <div className="rift-portal" />
            </div>
          </section>

          <div className="row" style={{ margin: '16px 0', flexWrap: 'wrap' }}>
            {me && !isLeader && (
              <button
                className={me.ready ? 'btn' : 'btn btn-primary'}
                disabled={busy}
                onClick={() => actions.ready.mutate({ lobbyId: l.id, ready: !me.ready })}
              >
                {me.ready ? 'Not ready' : "I'm ready"}
              </button>
            )}
            {isLeader && (
              <button
                className="btn btn-primary"
                disabled={busy || !allReady}
                onClick={() => actions.start.mutate(l.id)}
              >
                {allReady ? 'Enter the Rift' : 'Waiting for everyone to be ready…'}
              </button>
            )}
          </div>

          <section className="panel">
            <div className="panel-title">Invite friends</div>
            {inviteable.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No friends to invite. <Link to="/friends">Add friends</Link>
              </p>
            ) : (
              <ul className="friend-list">
                {inviteable.map((f) => (
                  <li key={f.characterId} className="friend-row">
                    <CharacterToken appearance={f.appearance} size={32} />
                    <span style={{ flex: 1 }}>
                      {f.name} <span className="muted">· {f.online ? 'online' : 'offline'}</span>
                    </span>
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() =>
                        actions.invite.mutate({ lobbyId: l.id, friendCharacterId: f.characterId })
                      }
                    >
                      Invite
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </Screen>
  );
}
