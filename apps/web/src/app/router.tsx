import { createBrowserRouter, Link, Navigate } from 'react-router';
import { GuestOnly, RequireAuth } from '../features/auth/guards';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CharacterCreatePage } from '../features/characters/CharacterCreatePage';
import { CharacterSelectPage } from '../features/characters/CharacterSelectPage';
import { WorldPage } from '../features/world/WorldPage';

/*
 * Route map
 *   /login, /register        guests only
 *   /characters              account area: pick a character
 *   /characters/new          character creation
 *   /world                   exploration (requires an active character)
 *   /combat/:id              (future) separate combat screen
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
      { path: '/world', element: <WorldPage /> },
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
