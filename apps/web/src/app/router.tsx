import { createBrowserRouter, Link } from 'react-router';
import { GuestOnly, RequireAuth } from '../features/auth/guards';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CharacterCreatePage } from '../features/characters/CharacterCreatePage';
import { CharacterSelectPage } from '../features/characters/CharacterSelectPage';
import { CharacterSheetPage } from '../features/characters/CharacterSheetPage';
import { PlayEntry } from '../features/characters/PlayEntry';
import { WorldPage } from '../features/world/WorldPage';
import { RiftsPage } from '../features/rifts/RiftsPage';
import { RunPage } from '../features/rifts/RunPage';
import { ProfessionsPage } from '../features/professions/ProfessionsPage';
import { InspectPage } from '../features/professions/InspectPage';
import { WorldBossPage } from '../features/worldboss/WorldBossPage';
import { CityPage } from '../features/city/CityPage';
import { LobbyPage } from '../features/rifts/LobbyPage';
import { FriendsPage } from '../features/social/FriendsPage';
import { GuildPage } from '../features/guild/GuildPage';
import { Screen } from '../shared/ui/Screen';
import { GameShell } from '../features/game/GameShell';
import { HomePage } from '../features/game/HomePage';
import { AdminPage } from '../features/admin/AdminPage';

/*
 * Route map
 *   /login, /register        guests only
 *   /                        front door: back into the game with the last character played
 *   /characters              account area: switch / create characters (secondary)
 *   /characters/new          character creation
 *   /characters/:id          character sheet (attributes, stats, equipment, abilities)
 *   /home                    the hex you are on: its scene, actions and hex chat (in GameShell)
 *   /world                   exploration map (in GameShell)
 *   /rifts                   Rift list, lobbies (in GameShell)
 *   /rifts/runs/:runId       a Rift run: map/exploration screen, combat screen for fights
 *   /rifts/lobbies/:lobbyId  group lobby (up to 6)
 *   /friends                 friends list and requests (in GameShell)
 *   /admin                   admin tools (ADMIN_EMAILS only): characters, custom items/abilities
 */
export const router = createBrowserRouter([
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
      { path: '/', element: <PlayEntry /> },
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
          { path: '/guild', element: <GuildPage /> },
          { path: '/professions', element: <ProfessionsPage /> },
          { path: '/professions/inspect/:name', element: <InspectPage /> },
          { path: '/world-boss', element: <WorldBossPage /> },
          { path: '/city/:tab', element: <CityPage /> },
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
