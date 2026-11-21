# Architecture

This document describes how The Living Realms is built and how it is meant to
grow. Decisions and their rationale are recorded in [DECISIONS.md](DECISIONS.md).

## 1. Goals and constraints

The architecture must support, without a rewrite:

1. Many players acting simultaneously in one shared world.
2. A **persistent world** that keeps running when nobody is online.
3. **Combat separate from exploration** (own screen, own server-side instances).
4. Permanent progression (reputation), nations and languages.
5. An economy with player-to-player trade (no item duplication, no lost value).
6. NPCs with their own state and behaviour.
7. World events that change the world.
8. Significant growth in player count.

…while staying **simple enough for a small team**: one language, one database,
one deployable image, a handful of processes.

## 2. System overview

```
                    Browser (React SPA)
              ┌─────────┴──────────┐
        HTTP (REST/JSON)     WebSocket (/ws)
              │                    │
   ┌──────────▼────────────────────▼──────────┐       ┌───────────────────────────┐
   │  server  (stateless, N instances)         │       │  worker (1 leader + standby)│
   │  ─ HTTP API: auth, characters, world      │       │  ─ world tick loop          │
   │  ─ WebSocket gateway: intents → rules     │       │  ─ maintenance jobs         │
   │  ─ serves the built web client (prod)     │       │  ─ (future) NPCs, events,   │
   └──────┬─────────────────────┬──────────────┘       │    economy, combat timers   │
          │ SQL                 │ pub/sub, presence    └──────┬───────────┬──────────┘
          ▼                     ▼                             │           │
   ┌──────────────┐     ┌──────────────┐◄─────────────────────┘           │
   │ PostgreSQL   │◄────┤    Redis     │                                  │
   │ source of    │     │ ephemeral:   │◄─────────────────────────────────┘
   │ truth        │     │ bus, presence│
   └──────────────┘     │ rate limits  │
                        └──────────────┘
```

**Modular monolith, two process types.** All game code lives in one repository
and one image. It runs as:

| Process  | Responsibility                                                                          | Scaling                                                                                  |
| -------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `server` | HTTP API, WebSocket gateway, validation of player intents                               | Horizontal (stateless); any number behind a load balancer                                |
| `worker` | Everything that happens _without_ a player request: world clock, NPCs, events, cleanups | One active leader per world (PostgreSQL advisory lock); extra instances are hot standbys |

This split is what makes the world **persistent**: the world advances on the
worker's clock, not on player requests.

## 3. Code organization

```
apps/web          → UI only. Talks to the server via HTTP + WebSocket.
apps/server       → Transport + orchestration (routes, gateway, services, repositories).
apps/worker       → Simulation + scheduled jobs.
packages/shared   → Contracts: zod request schemas, DTO types, WS protocol, error codes.
packages/game-core→ Pure game rules. No I/O. Deterministic.
packages/db       → Schema, migrations, DB client.
packages/server-kit → Infra shared by server & worker (logger, Redis, bus, presence).
```

Dependency direction (arrows = "may import"):

```
web ──► shared, game-core
server ──► shared, game-core, db, server-kit
worker ──► shared, game-core, db, server-kit
game-core ──► shared
db, server-kit ──► shared
```

`game-core` never imports `db` or anything with I/O. This keeps the rules
testable in isolation and reusable by the client for previews (e.g. "this move
costs 3 AP") while the **server stays authoritative**.

### Server module layout

Each domain is a module under `apps/server/src/modules/<domain>/`:

```
<domain>.routes.ts      HTTP endpoints: parse input (zod) → call service → map to DTO
<domain>.service.ts     Use cases, transactions, game-rule calls, world events
<domain>.repository.ts  SQL (Drizzle) only; accepts a db *or* a transaction handle
```

Future domains (`combat`, `reputation`, `nations`, `economy`, `npcs`, `events`)
follow the same shape. A module that later needs its own process can be lifted
out along this boundary.

### Game content as data

Item and ability definitions live as typed data in
`packages/game-core/src/content/` (`items.ts`, `abilities.ts`). The database
stores only instances (an owned item references an `item_def_id`; learned skills
reference an ability id). Server and client import the same definitions, so the
client can preview (e.g. a weapon's abilities at character creation) while the
server stays authoritative. Derived statistics are computed by
`game-core/stats.ts` from base attributes and equipped, non-broken items; they
are never stored. See ADR-020.

## 4. Request lifecycle and server authority

**The client never decides outcomes.** It sends _intents_; the server validates
and executes them.

HTTP request:

1. `onRequest` — security headers, rate limit, Origin check (CSRF).
2. `preHandler` — session cookie → `request.auth` (account) or `null`.
3. Route — `parse(schema, body)` (zod, from `@realms/shared`) → 400 on failure.
4. Service — game rules from `@realms/game-core`, DB transaction, world event.
5. Errors are mapped to `{ error: { code, message, details?, requestId } }`.

WebSocket message:

1. Per-connection token bucket (rate limit) → `error RATE_LIMITED`.
2. JSON parse + `clientMessageSchema` (zod discriminated union).
3. Dispatch to a handler by `type`. Handlers call the same services as HTTP.
4. Results are sent to the caller and/or published to the bus for others.

### Concurrency rules (important for economy/trade later)

- Anything that changes value (items, currency, ownership) runs in **one
  PostgreSQL transaction** with row locks (`SELECT … FOR UPDATE`) on the rows
  involved. Example already in place: character creation locks the account row
  so the per-account limit cannot be exceeded by concurrent requests (covered by
  a test).
- Uniqueness is enforced by **database constraints**, not by "check then
  insert" (e.g. case-insensitive unique character names per world).
- Future trade/market endpoints will take an **idempotency key** so retries
  cannot apply twice.

## 5. Real-time model

### Protocol

Defined in `packages/shared/src/protocol.ts`. Envelope `{ type, data? }`.

| Direction | Type                                        | Meaning                 |
| --------- | ------------------------------------------- | ----------------------- |
| C → S     | `world.enter {characterId}`                 | Play this character     |
| C → S     | `world.leave`                               | Stop playing            |
| C → S     | `ping {t}`                                  | Latency probe           |
| S → C     | `welcome {protocolVersion, connectionId}`   | Connection accepted     |
| S → C     | `world.entered {world, character, players}` | Snapshot after entering |
| S → C     | `player.joined` / `player.left`             | Presence changes        |
| S → C     | `world.tick {tick, at}`                     | World clock advanced    |
| S → C     | `error {code, message}`                     | Intent rejected         |

Close codes: `4001` unauthenticated / logged out, `4002` session replaced
(another tab took over), `4003` protocol abuse, `4004` server shutdown,
`4005` forbidden origin.

Pattern for every future feature: **snapshot on enter + incremental events**.

### Authentication

The WebSocket handshake carries the same HttpOnly session cookie as HTTP. The
Origin header is checked against `WEB_ORIGIN` (prevents cross-site WebSocket
hijacking). Logging out publishes `session.revoked`, which closes every socket
opened with that session on every instance.

### "One active character per account"

Enforced cluster-wide. When a connection enters the world, the server publishes
`account.replace {accountId, keepConnectionId}` on the control channel; every
instance closes that account's _other_ in-world connections with code `4002`.
The client shows "Playing elsewhere" and does not auto-reconnect.

### Bus (Redis pub/sub)

Any process can reach players on any server instance:

- `realms:bus:world:<worldId>` — broadcasts to everyone in a world (presence,
  ticks; later: world events, chat, map changes).
- `realms:bus:control` — instance-level control messages.

The bus is **fire-and-forget**. Anything that must not be lost is written to
PostgreSQL first; the bus only notifies. A client that reconnects receives a
fresh snapshot.

### Presence

Who is online lives in Redis (`realms:presence:<worldId>` hash), never in
PostgreSQL. Each entry records its owning `connectionId` and is refreshed every
15 s. Removal is compare-and-delete (Lua), so an old connection can never remove
a newer one's entry. Entries not refreshed for 60 s (crashed instance) are
swept by the worker, which announces `player.left`.

### Scaling the real-time layer

- Today: every instance receives every world broadcast and filters locally.
  Fine up to thousands of concurrent players.
- Next step (when needed): **area-of-interest channels** per map region
  (`bus:region:<id>`) so each instance subscribes only to regions its players
  are in. The protocol and bus API do not change.
- Load balancer: no sticky sessions required (sessions are in PostgreSQL,
  presence in Redis).

## 6. Persistent world simulation (worker)

- **Leader election:** `pg_try_advisory_lock(hashtext('world-loop:<worldId>'))`
  on a dedicated connection. If the leader dies its connection closes and a
  standby takes over within ~5 s.
- **Tick loop:** fixed interval (`WORLD_TICK_MS`, default 5 s). Ticks never
  overlap; a failed tick is logged and the loop continues. Each tick increments
  `worlds.tick` and broadcasts `world.tick`.
- **Maintenance** (every 12 ticks): purge expired sessions, sweep stale presence.

How future systems plug in (design intent, not implemented):

| System        | Approach                                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NPCs          | State in PostgreSQL; behaviour evaluated per tick **per region**, and only for regions that are "awake" (players nearby) or have scheduled work. Dormant regions are caught up lazily on wake (compute elapsed ticks), avoiding cost for empty areas. |
| World events  | `scheduled_events` table processed by the worker; outcomes written to world tables + `world_events`, then broadcast.                                                                                                                                  |
| Economy       | Periodic jobs (price indices, NPC markets, upkeep); player trades are synchronous server transactions, not tick-based.                                                                                                                                |
| Combat timers | Turn timeouts scheduled by the worker (later via a job queue such as BullMQ on the existing Redis).                                                                                                                                                   |

If one tick loop becomes too heavy, the world is **partitioned by region**
across several workers (one advisory lock per partition).

## 7. Rift runs: dungeon exploration and combat

A Rift run (request #31, "The Rift") is a **dungeon**: a branching map of rooms
(Slay-the-Spire style) ending with a mandatory boss. Combat is one kind of
room, drawn on its own screen.

### 7.1 Exploration (`game-core/src/rift`)

- **Map (`rift/map.ts`):** generated procedurally from a template (data in
  `content/rifts.ts` → `MapTemplate`): `paths` walks from row 0 to the last
  row, one lane step at a time, never crossing; walks that meet share rooms,
  so branches split and converge. Each walk has a theme (safe, exploration,
  loot, danger, mixed) whose weights choose room types under rules (fixed first
  row = Combat, row before the boss = Campsite, no Elite before row 2, no two
  Campsites/Elites/Loot rooms in a row). Secret rooms hang hidden from some
  rooms and lead two rows ahead. Every map is validated (≥ 10 rooms, minimum
  of each type, ≥ 2 entrances, a convergence, no dead ends) and regenerated
  deterministically if invalid.
- **Run state machine (`rift/run.ts`):** `map → (vote) → combat | event |
room → (continue) → map … → boss`. Group decisions are votes (majority once
  everyone voted or when the 60 s timer ends; the leader breaks ties); for
  events the vote also names who attempts the approach. Room types and
  conditions are data (`content/rooms.ts`), events are data
  (`content/events.ts`). HP/Mana, slots and lasting conditions (debuffs and
  boons from events, applied at the start of each fight) persist between rooms.
- **BASE STATS rule (`rift/tests.ts`):** every exploration test (events,
  secret searches, any roll in the Rift) is `roll 1..10 + BASE attribute ≥
difficulty`. `BaseAttributes` is a branded type built only by
  `asBaseAttributes` (the server's `baseAttributesOf`), so equipped totals
  cannot be passed by mistake.
- **Rewards:** fights give nothing; Loot/Secret rooms and some events grant
  items at once (`grants`, inserted by the server); the main rewards come after
  the boss.
- **Hidden information:** hidden secret rooms are never sent to clients
  (`toMapDto`).

### 7.2 Combat (`game-core/src/combat`)

- **Design goal (D36 + combat spec of request #31):** "Slay the Spire without
  cards + Darkest Dungeon", with a **planning phase** and an **alternating
  resolution**.
- **Round:** (1) Block is reset, damage-over-time ticks, statuses count down,
  every unit gains Focus from Precision (`focusPerRound`: min 3, unspent Focus
  carries over to a cap) and team initiative is rolled (roll + Agility; each
  team keeps its best). (2) Enemies plan (visible intents). (3) Players add
  actions to the party plan (Focus/Mana are reserved) and confirm (`ready`).
  (4) Actions resolve one at a time, alternating teams, starting with the
  initiative winner; each team resolves its own actions in planned order; when
  one team runs out the other finishes. Each action resolves completely
  (damage → Block → HP → defeat) against the current battlefield; downed or
  stunned units skip their actions; attacks whose column emptied re-aim.
- **Engine:** pure and deterministic, `(state, action) → state`; the RNG state
  lives inside the state. The AI (`planEnemyIntents`) only decides; the same
  resolution code validates and applies both teams' actions. Formation (D38):
  3 columns × 2 lines; attacks pick a column (D41); enemies play the formation
  (D42). Damage = roll × attribute scaling × weapon upgrade × statuses × crit,
  reduced by rating/(rating+50), then absorbed by Block.
- **Weapons (`content/weapons.ts`):** a catalogue of weapon types (hands,
  primary/secondary attribute, attack type, base damage, basic attack). Every
  weapon of a type and upgrade level has identical numbers; upgrades multiply
  the weapon's ability values. Items store upgrade level, specials (max 5) and
  2 rune slots (locked; Runemaster = future).

### 7.3 PvP arena (test mode, request #33)

`createPvpEncounter` puts two teams of players on the two sides; both plan at
the same time and the normal resolution alternates by team initiative. Matches
start from a lobby with `riftId = 'pvp_arena'` and are stored like runs
(`RunState.mode = 'pvp'`); the server hides the other team's plan (ADR-037).

### 7.4 Server, timers and client

- **Server (`modules/rifts`):** each run is a row in `rift_runs` holding the
  whole `RunState` (map, party, current room, combat state, votes) as JSONB.
  Every action runs in a transaction that locks the run row, applies the
  game-core function, inserts granted items and saves the new state. Rewards
  (reputation, drops) and penalties (equipment quality) are applied in the
  transaction that ends the run.
- **Timer (60 s):** `turn_deadline` holds the deadline of the current decision
  (vote) or planning phase. Expired timers are applied lazily whenever the run
  is read or acted upon (catch-up loop); the client re-fetches at zero.
- **Transport:** HTTP for actions; group runs refresh by polling (~1.5 s, ~4 s
  while you are still planning). A WebSocket push can replace polling later
  without API changes (ADR-025).
- **Lobbies and friends:** `modules/rifts/lobbies.service.ts` (up to 6, leader
  starts the run; the lobby leader is the run leader) and `modules/social`.
  Leaving a group run penalises only the leaver.
- **Client:** `/rifts/runs/:runId` → `RunPage`: the exploration screen
  (`RiftMap.tsx` SVG map, party panel, event/room panel) or the combat screen
  (`CombatPage.tsx`: plan queue left, round + initiative top, enemy intents
  right, battlefield centre drawn with PixiJS, character panel bottom-left,
  ability bar + Ready bottom-right, following the owner's reference). New log
  entries become animation steps; the controls wait for the replay.

Balance is checked with `pnpm sim` (`scripts/simulate-balance.ts`): whole runs
(random path, events with the best base stat, plan → ready fights) for ten
typical builds, solo and in groups.

## 7b. Professions (request #33)

Data in `game-core/src/content/professions.ts` (professions, activities,
recipes) and pure rules in `game-core/src/professions.ts` (chance, yield, XP,
repairs, upgrades). The server module `modules/professions` checks level,
materials and cooldown, rolls with a server seed, consumes/creates items
(stacks) and stores levels in `character_professions`. Screen: `/professions`.

## 8. World map

Hexagonal grid, **axial coordinates (q, r)**, pointy-top. Utilities live in
`packages/game-core/src/hex.ts` (distance, neighbours, ranges, pixel
conversion, `pixelToHex` for picking). Characters store `hex_q`, `hex_r`.
The client draws the map with PixiJS (`features/world/map-scene.ts`; camera
maths in `map-camera.ts`): drag to pan, wheel/pinch/buttons/keys to zoom. Movement cost in Action Points
per hex, terrain, pathfinding and fog of war are later-phase mechanics built on
these utilities. The map tiles themselves will live in a `map_hexes` table (see
DATABASE.md).

## 9. Frontend

- **React + Vite SPA.** No SSR (a game client behind login gains nothing from it).
- **Routing:** `/login`, `/register` (guests) → `/characters`, `/characters/new`
  (account area) → the in-game shell (`GameShell`, ADR-031): `/home` (hub),
  `/world` (map), `/rifts`, `/friends` → `/rifts/lobbies/:id`, `/rifts/runs/:id`
  (combat, own screen).
- **State:**
  - _Server state_ (REST): TanStack Query (`features/*/api.ts`).
  - _Real-time state:_ a Zustand store fed by the WebSocket through a **pure
    reducer** (`world-state.ts`, unit-tested).
  - _Per-tab UI state:_ active character in `sessionStorage`.
- **Structure:** feature folders (`features/auth`, `characters`, `world`,
  `combat`), shared UI primitives in `shared/ui`, infrastructure in `lib`
  (`api.ts`, `realtime.ts` with automatic reconnection and backoff).
- **Rendering:** menus, panels and forms are React DOM. The world map and the
  combat stage are PixiJS canvases (ADR-029), loaded lazily, with shared
  infrastructure in `features/render` (`usePixiScene`, SVG → texture). Input
  for combat stays on DOM buttons over the canvas (accessibility, tests).
- **Validation** reuses the server's schemas and rules (`@realms/shared`,
  `@realms/game-core`) for instant feedback; the server re-validates everything.
- All player-facing text is English.

## 10. Security

| Concern   | Measure                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Passwords | Argon2id (OWASP parameters); constant-time-ish login (dummy verify for unknown emails)                                                                 |
| Sessions  | 256-bit random opaque token in an `HttpOnly`, `SameSite=Lax` (+ `Secure` in prod) cookie; only its SHA-256 is stored; 30-day sliding expiry; revocable |
| CSRF      | SameSite cookies + Origin allow-list on non-GET requests and WS handshakes                                                                             |
| Input     | zod validation on every HTTP body and WS message; 64 KB body limit; 16 KB WS frame limit                                                               |
| Abuse     | Rate limiting: global (300/min/IP), auth endpoints (10/min/IP), per-socket token bucket; Redis-backed across instances                                 |
| Headers   | Helmet (CSP, nosniff, frame protection, …)                                                                                                             |
| Secrets   | Environment variables only; `.env` git-ignored; config validated at boot                                                                               |
| Logs      | Cookies, auth headers, passwords and tokens are redacted                                                                                               |
| Cheating  | The server is authoritative; the client only sends intents                                                                                             |

Planned: email verification and password reset (needs an email provider),
account lockout/CAPTCHA if credential stuffing appears, admin audit tooling.

## 11. Observability

- Structured JSON logs (pino) with `service`, request id (`x-request-id`
  response header), `accountId`/`connectionId` on real-time logs. Pretty-printed
  in development.
- `GET /healthz` (liveness) and `GET /readyz` (PostgreSQL + Redis reachable).
- `world_events` is the business audit trail.
- Next: metrics (Prometheus/OpenTelemetry: connected players, tick duration,
  request latency) and error tracking (e.g. Sentry).

## 12. Testing strategy

| Level       | Tool                             | Where                                                              | What                                                                                                                    |
| ----------- | -------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Unit        | Vitest                           | `packages/game-core/test`, `apps/web/test`                         | Pure rules, reducers                                                                                                    |
| Integration | Vitest + real PostgreSQL & Redis | `apps/server/test`, `apps/worker/test`, `packages/server-kit/test` | HTTP API, WebSocket gateway, presence, worker jobs, security behaviour                                                  |
| End-to-end  | Playwright                       | `e2e/`                                                             | Browser → Vite → API → DB: register, create character, enter world, multi-player presence, single-active-character rule |

Integration tests use a **separate test database** (`TEST_DATABASE_URL`) and
Redis DB 15; tables are truncated between tests. No mocks of the database: the
behaviours that matter (constraints, locks, transactions) only exist in the real
engine.

## 13. Configuration and environments

| Environment | How it runs                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------ |
| development | `pnpm dev`; Vite proxies `/api` and `/ws` to the API so the browser sees one origin              |
| test        | Vitest/Playwright set their own env (test DB, Redis DB 15, quiet logs)                           |
| production  | Docker image; env from the platform; `COOKIE_SECURE=true`, `TRUST_PROXY=true` behind a TLS proxy |

All variables are documented in `.env.example` and validated with zod at
startup (`apps/server/src/config.ts`, `apps/worker/src/config.ts`).

## Deployment

One image (`infra/Dockerfile`), three commands:

```
node migrate.js   # one-off, before each release
node server.js    # API + WebSocket + static web client, N replicas
node worker.js    # world simulation, 1–2 replicas (leader + standby)
```

Requirements: PostgreSQL 16, Redis 7, TLS termination in front of the server
(load balancer / reverse proxy with WebSocket support). The server shuts down
gracefully on `SIGTERM` (closes sockets with `4004`, clears presence), so
rolling deploys only cause a short client reconnect.

`infra/docker-compose.prod.yml` is a runnable example of the full stack.

### Hosting: Railway

The live environment runs on **Railway** (see DECISIONS ADR-018). Four
services in one project: managed PostgreSQL, managed Redis, `server` and
`worker`. Both app services build the same `infra/Dockerfile`; their per-service
settings are versioned in `railway.json` (repository root, picked up
automatically by the `server` service) and `infra/railway/worker.json` (set as
the `worker` service's config file) (start command, `/readyz` health check, restart policy, watch paths).
Migrations are applied by the processes themselves at startup
(`MIGRATE_ON_START`, default `true`), under a PostgreSQL advisory lock so
concurrent starts never race; `migrate.js` remains available for manual runs. Variables
reference the managed services (`${{Postgres.DATABASE_URL}}`,
`${{Redis.REDIS_URL}}`). Pushing to `main` deploys automatically. The
step-by-step setup is in `docs/DEPLOY_RAILWAY.md`.
