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
import { Screen } from '../shared/ui/Screen';

/*
 * Route map
 *   /login, /register        guests only
 *   /characters              account area: pick a character
 *   /characters/new          character creation
 *   /characters/:id          character sheet (attributes, stats, equipment, abilities)
 *   /world                   exploration (requires an active character)
 *   /rifts                   Rift list (enter solo; lobbies in M3)
 *   /rifts/runs/:runId       combat screen (separate from exploration)
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
