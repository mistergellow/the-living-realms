import { Link, useNavigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useLogout, useMe } from '../auth/api';
import { useActiveCharacter } from './active-character';
import { useCharacters, useDeleteCharacter } from './api';
import { CharacterToken } from './CharacterToken';

export function CharacterSelectPage() {
  const me = useMe();
  const characters = useCharacters();
  const del = useDeleteCharacter();
  const logout = useLogout();
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();

  const play = (id: string) => {
    select(id);
    navigate('/world');
  };

  const list = characters.data?.characters ?? [];
  const limit = characters.data?.limit ?? 0;

  return (
    <main className="page">
      <header className="page-header">
        <h1>Your characters</h1>
        <span className="spacer" />
        <span className="muted">{me.data?.email}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
        >
          Log out
        </button>
      </header>

      <FormError error={characters.error ?? del.error} />
      {characters.isPending ? (
        <p className="muted">Loading characters…</p>
      ) : list.length === 0 ? (
        <div className="panel stack" style={{ alignItems: 'flex-start' }}>
          <p style={{ margin: 0 }}>You have no characters yet. Create one to enter the world.</p>
          <Link className="btn btn-primary" to="/characters/new">
            Create character
          </Link>
        </div>
      ) : (
        <div className="stack">
          <div className="char-grid">
            {list.map((c) => (
              <article key={c.id} className="panel" data-testid="character-card">
                <div className="char-card">
                  <CharacterToken appearance={c.appearance} size={48} title={c.name} />
                  <div>
                    <div className="name">{c.name}</div>
                    <div className="meta">
                      {c.lastPlayedAt
                        ? `Last played ${new Date(c.lastPlayedAt).toLocaleString()}`
                        : 'Never played'}
                    </div>
                  </div>
                </div>
                <div className="char-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => play(c.id)}>
                    Play
                  </button>
                  <Link className="btn btn-sm" to={`/characters/${c.id}`}>
                    Sheet
                  </Link>
                  <button
                    className="btn btn-ghost btn-sm btn-danger"
                    disabled={del.isPending}
                    onClick={() => {
                      if (confirm(`Delete ${c.name}? This cannot be undone.`)) del.mutate(c.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="row">
            <span className="muted">
              {list.length} / {limit} characters
            </span>
            <span className="spacer" />
            {list.length < limit && (
              <Link className="btn" to="/characters/new">
                New character
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
