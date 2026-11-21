import { createBrowserRouter, Link, Navigate } from 'react-router';
import { GuestOnly, RequireAuth } from '../features/auth/guards';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CharacterCreatePage } from '../features/characters/CharacterCreatePage';
import { CharacterSelectPage } from '../features/characters/CharacterSelectPage';
import { CharacterSheetPage } from '../features/characters/CharacterSheetPage';
import { WorldPage } from '../features/world/WorldPage';
import { RiftsPage } from '../features/rifts/RiftsPage';
import { RunPage } from '../features/rifts/RunPage';
import { LobbyPage } from '../features/rifts/LobbyPage';
import { FriendsPage } from '../features/social/FriendsPage';
import { Screen } from '../shared/ui/Screen';
import { GameShell } from '../features/game/GameShell';
import { HomePage } from '../features/game/HomePage';
import { AdminPage } from '../features/admin/AdminPage';

/*
 * Route map
 *   /login, /register        guests only
 *   /characters              account area: pick a character
 *   /characters/new          character creation
 *   /characters/:id          character sheet (attributes, stats, equipment, abilities)
 *   /home                    hub (requires an active character; in GameShell)
 *   /world                   exploration map (in GameShell)
 *   /rifts                   Rift list, lobbies (in GameShell)
 *   /rifts/runs/:runId       a Rift run: map/exploration screen, combat screen for fights
 *   /rifts/lobbies/:lobbyId  group lobby (up to 6)
 *   /friends                 friends list and requests (in GameShell)
 *   /admin                   admin tools (ADMIN_EMAILS only): characters, custom items/abilities
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
      { path: '/admin', element: <AdminPage /> },
      {
        // In-game frame: world connection, top bar, bottom navigation.
        element: <GameShell />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/world', element: <WorldPage /> },
          { path: '/rifts', element: <RiftsPage /> },
          { path: '/friends', element: <FriendsPage /> },
        ],
      },
      { path: '/rifts/runs/:runId', element: <RunPage /> },
      { path: '/rifts/lobbies/:lobbyId', element: <LobbyPage /> },
    ],
  },
  {
    path: '*',
    element: (
      <Screen>
        <main className="centered">
          <div className="panel stack" style={{ textAlign: 'center', alignItems: 'center' }}>
            <h1 className="logo" style={{ fontSize: '2rem' }}>
              Lost in the mists
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              This place does not exist.
            </p>
            <Link className="btn btn-primary" to="/">
              Return
            </Link>
          </div>
        </main>
      </Screen>
    ),
  },
]);
