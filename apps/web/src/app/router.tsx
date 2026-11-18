import { createBrowserRouter, Link, Navigate } from 'react-router';
import { GuestOnly, RequireAuth } from '../features/auth/guards';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CharacterCreatePage } from '../features/characters/CharacterCreatePage';
import { CharacterSelectPage } from '../features/characters/CharacterSelectPage';
import { CharacterSheetPage } from '../features/characters/CharacterSheetPage';
import { WorldPage } from '../features/world/WorldPage';
import { RiftsPage } from '../features/rifts/RiftsPage';
import { CombatPage } from '../features/rifts/CombatPage';
import { LobbyPage } from '../features/rifts/LobbyPage';
import { FriendsPage } from '../features/social/FriendsPage';

/*
 * Route map
 *   /login, /register        guests only
 *   /characters              account area: pick a character
 *   /characters/new          character creation
 *   /characters/:id          character sheet (attributes, stats, equipment, abilities)
 *   /world                   exploration (requires an active character)
 *   /rifts                   Rift list (enter solo; lobbies in M3)
 *   /rifts/runs/:runId       combat screen (separate from exploration)
 *   /rifts/lobbies/:lobbyId  group lobby (up to 6)
 *   /friends                 friends list and requests
 */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/characters" replace /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/characters', element: <CharacterSelectPage /> },
      { path: '/characters/new', element: <CharacterCreatePage /> },
      { path: '/characters/:id', element: <CharacterSheetPage /> },
      { path: '/world', element: <WorldPage /> },
      { path: '/rifts', element: <RiftsPage /> },
      { path: '/rifts/runs/:runId', element: <CombatPage /> },
      { path: '/rifts/lobbies/:lobbyId', element: <LobbyPage /> },
      { path: '/friends', element: <FriendsPage /> },
    ],
  },
  {
    path: '*',
    element: (
      <main className="centered">
        <div className="stack" style={{ textAlign: 'center' }}>
          <h1>Lost in the mists</h1>
          <p className="muted">This place does not exist.</p>
          <Link to="/">Return</Link>
        </div>
      </main>
    ),
  },
]);
