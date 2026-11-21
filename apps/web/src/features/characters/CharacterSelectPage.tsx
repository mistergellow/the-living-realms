import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { useLogout, useMe } from '../auth/api';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { useActiveCharacter } from './active-character';
import { useCharacters, useDeleteCharacter } from './api';
import { CharacterToken } from './CharacterToken';
import { lastPlayed } from './PlayEntry';

/**
 * Hero select (secondary since request #40: the game opens with the last
 * character played; this screen is for switching and creating). The focused
 * character stands on a pedestal, the roster sits below.
 */
export function CharacterSelectPage() {
  const me = useMe();
  const characters = useCharacters();
  const del = useDeleteCharacter();
  const logout = useLogout();
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();
  const [focusId, setFocusId] = useState<string | null>(null);

  const play = (id: string) => {
    select(id);
    navigate('/home');
  };

  const list = characters.data?.characters ?? [];
  const limit = characters.data?.limit ?? 0;
  // Default focus: the most recently played character.
  const focused = list.find((c) => c.id === focusId) ?? lastPlayed(list);

  return (
    <Screen>
      <header className="topbar">
        <span className="logo">The Living Realms</span>
        <span className="spacer" />
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {me.data?.email}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
        >
          <Icon name="exit" />
          Log out
        </button>
      </header>

      <main className="select-body">
        <section className="select-stage">
          <div className="stack" style={{ alignItems: 'center', width: '100%' }}>
            <FormError error={characters.error ?? del.error} />
            {characters.isPending ? (
              <div className="loading">
                <span className="rune-spinner" aria-hidden />
                Loading characters…
              </div>
            ) : !focused ? (
              <div className="panel stack" style={{ alignItems: 'center', textAlign: 'center' }}>
                <h2>No heroes yet</h2>
                <p className="muted" style={{ margin: 0 }}>
                  You have no characters yet. Create one to enter the world.
                </p>
                <Link className="btn btn-primary btn-lg" to="/characters/new">
                  Create character
                </Link>
              </div>
            ) : (
              <div className="select-hero">
                <div className="pedestal">
                  <CharacterAvatar
                    appearance={focused.appearance}
                    size={300}
                    title={focused.name}
                  />
                </div>
                <h2 className="logo">{focused.name}</h2>
                <span className="muted">
                  {focused.lastPlayedAt
                    ? `Last played ${new Date(focused.lastPlayedAt).toLocaleString()}`
                    : 'Never played'}
                </span>
                <div className="select-actions">
                  <button className="btn btn-primary btn-lg" onClick={() => play(focused.id)}>
                    Play
                  </button>
                </div>
                <div className="select-actions">
                  <Link className="btn btn-sm" to={`/characters/${focused.id}`}>
                    <Icon name="scroll" />
                    Sheet
                  </Link>
                  <button
                    className="btn btn-ghost btn-sm btn-danger"
                    disabled={del.isPending}
                    onClick={() => {
                      if (confirm(`Delete ${focused.name}? This cannot be undone.`))
                        del.mutate(focused.id, { onSuccess: () => setFocusId(null) });
                    }}
                  >
                    <Icon name="trash" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {list.length > 0 && (
          <nav className="roster" aria-label="Your characters">
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                className="roster-card"
                data-testid="character-card"
                aria-pressed={c.id === focused?.id}
                onClick={() => setFocusId(c.id)}
                onDoubleClick={() => play(c.id)}
              >
                <CharacterToken appearance={c.appearance} size={64} title={c.name} />
                <span className="name">{c.name}</span>
                <span className="meta">
                  {c.lastPlayedAt ? new Date(c.lastPlayedAt).toLocaleDateString() : 'New'}
                </span>
              </button>
            ))}
            {list.length < limit && (
              <Link className="roster-card roster-new" to="/characters/new">
                <span className="plus" aria-hidden>
                  +
                </span>
                New character
              </Link>
            )}
            <div
              className="roster-card roster-locked"
              aria-disabled="true"
              title="More character slots will be unlockable later."
              data-testid="locked-slot"
            >
              <span className="plus" aria-hidden>
                <Icon name="lock" />
              </span>
              More slots soon
            </div>
            <span className="roster-count">
              {list.length} / {limit}
            </span>
          </nav>
        )}
      </main>
    </Screen>
  );
}
