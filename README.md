# The Living Realms

A persistent, browser-based multiplayer world shaped by its players.

Players explore a shared hex-based world map, meet other players and NPCs, and
take part in turn-based strategic combat. Progression is reputation-based rather
than level-based, and nations, languages, diplomacy, an economy and world events
evolve with the players' actions.

> **Status: Phase 1 — technical foundation.** What exists today: accounts
> (register / login / logout), character creation and selection, a real-time
> world shell (hex map, live presence of other players, world clock), and the
> architecture to grow into the full game. See [ROADMAP.md](ROADMAP.md).

## Documentation

| Document                                 | Contents                                                       |
| ---------------------------------------- | -------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)       | System overview, processes, real-time model, code organization |
| [DATABASE.md](DATABASE.md)               | Data model, conventions, persistence strategy, future entities |
| [DECISIONS.md](DECISIONS.md)             | Technical decisions and their rationale (ADR log)              |
| [ROADMAP.md](ROADMAP.md)                 | Development phases                                             |
| [CLAUDE.md](CLAUDE.md)                   | Working rules for the AI assistant (read automatically)        |
| [docs/REQUESTS.md](docs/REQUESTS.md)     | Log of every request and design decision (PT)                  |
| [docs/CHANGE_MAP.md](docs/CHANGE_MAP.md) | Impact map: what to change when a concept changes (PT)         |

## Tech stack

TypeScript everywhere · pnpm workspaces · React 19 + Vite + React Router + TanStack Query + Zustand ·
Node.js 22 + Fastify 5 + WebSockets · PostgreSQL 16 + Drizzle ORM · Redis 7 · Vitest + Playwright.

## Requirements

- **Node.js ≥ 22.12** (see `.nvmrc`) and **pnpm 10** (`corepack enable`)
- **Docker** (for PostgreSQL and Redis) — or local PostgreSQL 16 and Redis 7 installations

## Getting started

```bash
corepack enable
pnpm install
cp .env.example .env          # defaults work with the docker-compose services
pnpm infra:up                 # PostgreSQL + Redis in Docker
pnpm db:migrate               # create the schema
pnpm dev                      # API (3000) + world worker + web (5173)
```

Open **http://localhost:5173**, create an account, create a character and enter the world.
Open a second browser (or a private window) with another account to see players appear in real time.

<details>
<summary>Without Docker (local PostgreSQL / Redis)</summary>

```sql
-- as the postgres superuser
CREATE USER realms WITH PASSWORD 'realms' CREATEDB;
CREATE DATABASE living_realms OWNER realms;
CREATE DATABASE living_realms_test OWNER realms;
```

Start Redis on port 6379, then continue from `pnpm db:migrate`.
</details>

## Scripts

| Command                                        | What it does                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`                                     | Runs server, worker and web in watch mode                                            |
| `pnpm build`                                   | Production build (web bundle + bundled server/worker)                                |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Static checks / formatting                                                           |
| `pnpm test`                                    | Unit + integration tests (needs PostgreSQL & Redis; uses the **test** database)      |
| `pnpm test:e2e`                                | Browser end-to-end tests with Playwright (starts its own servers on ports 3100/5174) |
| `pnpm db:generate`                             | Generate a new SQL migration after editing `packages/db/src/schema.ts`               |
| `pnpm db:migrate` / `pnpm db:seed`             | Apply migrations / ensure the world row exists                                       |
| `pnpm infra:up` / `pnpm infra:down`            | Start / stop PostgreSQL and Redis containers                                         |

First time running e2e locally: `pnpm exec playwright install chromium`.

## Project layout

```
apps/
  web/          React client (features/auth, characters, world; combat reserved)
  server/       Fastify API + WebSocket gateway (modules/auth, characters, world, health)
  worker/       World simulation process (tick loop, maintenance, leader election)
packages/
  shared/       API & real-time protocol contracts (zod schemas + types) — used by all
  game-core/    Pure, deterministic game rules (hex math, name rules) — used by all
  db/           Drizzle schema, migrations, DB client, seed
  server-kit/   Server-side infrastructure shared by server & worker (logger, Redis bus, presence)
infra/          docker-compose (dev + prod example), Dockerfile
e2e/            Playwright tests
```

## Configuration

All configuration comes from environment variables (validated at startup — the
process refuses to boot with invalid config). See [`.env.example`](.env.example)
for the full, commented list. Never commit `.env`.

## Production (overview)

`infra/Dockerfile` builds one image with three entrypoints — `server.js`
(API + WebSocket + static web client), `worker.js` and `migrate.js`.
`infra/docker-compose.prod.yml` shows a complete stack.

The live environment runs on **Railway**: see [docs/DEPLOY_RAILWAY.md](docs/DEPLOY_RAILWAY.md) (step-by-step, in Portuguese) and `infra/railway/`. See
[ARCHITECTURE.md → Deployment](ARCHITECTURE.md#deployment).
