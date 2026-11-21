import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { useMe } from '../auth/api';
import { AbilityEditor } from './AbilityEditor';
import { useCustomContent } from './api';
import { CharacterTools } from './CharacterTools';
import { ItemEditor } from './ItemEditor';
import './admin.css';

/*
 * Admin tools (request #41), /admin. Only for accounts listed in the server's
 * ADMIN_EMAILS; the server enforces it on every /api/admin call.
 */

const TABS = {
  characters: 'Characters',
  items: 'Items & weapons',
  abilities: 'Abilities',
} as const;
type Tab = keyof typeof TABS;

export function AdminPage() {
  const me = useMe();
  const custom = useCustomContent(true);
  const [tab, setTab] = useState<Tab>('characters');
  if (!me.data?.isAdmin) return <Navigate to="/characters" replace />;

  return (
    <Screen>
      <header className="topbar">
        <Link className="btn btn-ghost btn-sm" to="/characters">
          <Icon name="back" />
          Characters
        </Link>
        <span className="logo">Admin</span>
        <nav className="adm-tabs" role="tablist">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`btn btn-sm${tab === t ? ' btn-primary' : ' btn-ghost'}`}
              onClick={() => setTab(t)}
            >
              {TABS[t]}
            </button>
          ))}
        </nav>
        <span className="spacer" />
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {me.data.email}
        </span>
      </header>
      <main className="screen-body">
        <div className="contain">
          {tab === 'characters' && <CharacterTools custom={custom.data} />}
          {tab === 'items' && <ItemEditor custom={custom.data} />}
          {tab === 'abilities' && <AbilityEditor custom={custom.data} />}
        </div>
      </main>
    </Screen>
  );
}
