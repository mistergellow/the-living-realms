# Technical decisions

A lightweight Architecture Decision Record (ADR) log. Each entry records the
context, the decision, and its consequences. Add new entries at the end; mark
superseded ones instead of deleting them.

---

## ADR-001 — TypeScript across the whole stack, pnpm monorepo

**Status:** accepted (phase 1)

**Context.** Client and server must agree on request shapes, the real-time
protocol, error codes and game rules (e.g. name validation, hex distance).

**Decision.** TypeScript everywhere; pnpm workspaces with `apps/*` and
`packages/*`. Internal packages are consumed as TypeScript source (no build
step in development); production bundles are produced with esbuild/Vite.

**Consequences.** Contracts live once in `@realms/shared`; rules once in
`@realms/game-core`. Changing a contract breaks the build on both sides
immediately. Single toolchain. Nx/Turborepo were not adopted: unnecessary at
this size, easy to add later.

---

## ADR-002 — React SPA with Vite (no SSR framework)

**Status:** accepted

**Context.** The game is an interactive, logged-in, UI-heavy client (panels,
map, lists, chat). SEO and first-paint SSR do not matter behind a login.

**Decision.** React 19 + Vite + React Router 7. Exploration is DOM/SVG. Combat
will get its own canvas renderer (planned: PixiJS) on its own route.

**Alternatives.** Next.js (SSR and server components: complexity without
benefit here). Phaser for everything (a poor fit for a UI-heavy interface; may
still be used for combat). Svelte/Vue (viable; React chosen for ecosystem and
hiring).

---

## ADR-003 — State management: TanStack Query + Zustand

**Status:** accepted

**Decision.** REST/server data goes through **TanStack Query** (caching,
invalidation). Real-time world state goes in a **Zustand** store updated by a
**pure reducer** from WebSocket messages. Per-tab selection (active character)
lives in `sessionStorage`.

**Why.** It keeps "data I fetched" separate from "data being pushed to me". The
pure reducer is trivially unit-testable and could later be shared with a
replay/debug tool. Redux would add boilerplate without benefit.

---

## ADR-004 — Fastify on Node.js 22

**Status:** accepted

**Decision.** Fastify 5 for HTTP and WebSockets (`@fastify/websocket`, i.e.
`ws`). Domain modules use a routes → service → repository structure.

**Alternatives.** Express (slower, weaker typing and plugins). NestJS (heavy
abstractions for a small team). Go or Rust (faster, but we would lose shared
types and rules with the client; Node is ample for a turn-based game).

---

## ADR-005 — Plain WebSockets with our own typed protocol (not Socket.IO or Colyseus yet)

**Status:** accepted

**Decision.** Native WebSocket with a small JSON protocol defined by zod schemas
in `@realms/shared`, validated on the server. Reconnection is implemented in
the client (`lib/realtime.ts`). Multi-instance fan-out goes through Redis
pub/sub.

**Why.** Full control over authentication, validation and close codes; no
extra protocol layer; works with any load balancer.

**Revisit when.** Combat instances may benefit from Colyseus (room lifecycle,
state sync). It can be introduced for combat only, without touching
exploration.

---

## ADR-006 — Server-authoritative intents; pure rules in `game-core`

**Status:** accepted

**Decision.** Clients send intents only. The server validates the shape (zod)
and the rules (`game-core`), executes in a DB transaction, then notifies.
`game-core` has no I/O and is deterministic; randomness and time will be
injected.

**Consequences.** It prevents cheating by construction. Rules are unit-testable
and replayable (useful for combat logs and dispute resolution). The client can
reuse the rules for previews.

---

## ADR-007 — PostgreSQL as the source of truth; Drizzle ORM

**Status:** accepted

**Context.** An economy, trades and persistent progression need ACID
transactions, row locks and constraints. Relationships are rich (accounts →
characters → nations → items …).

**Decision.** PostgreSQL 16 with Drizzle ORM and drizzle-kit SQL migrations.
JSONB for evolving documents only.

**Alternatives.** MongoDB (weaker multi-document transactions and constraints:
risky for an economy). Prisma (heavier runtime, less control over SQL such as
partial and functional indexes, `FOR UPDATE`). Raw SQL (more boilerplate,
no type inference).

---

## ADR-008 — Redis for ephemeral, cross-process data only

**Status:** accepted

**Decision.** Redis holds pub/sub (the bus), presence, and rate-limit counters.
Nothing in Redis is required to reconstruct game state.

**Consequences.** Server instances are stateless, so they scale horizontally
and need no sticky sessions. A Redis outage degrades real-time features but
never loses data. Later use: job queue (BullMQ) for scheduled game events.

---

## ADR-009 — Opaque server-side sessions in HttpOnly cookies (not JWT)

**Status:** accepted

**Decision.** A 256-bit random token in an `HttpOnly; SameSite=Lax` (+
`Secure` in production) cookie; the database stores only its SHA-256. 30-day
sliding expiry; logout revokes the session and closes its WebSockets.
Passwords are hashed with Argon2id.

**Why not JWT.** It cannot be revoked instantly (bans, logout, stolen tokens)
without a server-side list anyway; tokens readable by JS are exposed to XSS.
The same cookie authenticates the WebSocket handshake. Cost: one indexed
lookup per request (cacheable in Redis later).

---

## ADR-010 — Two process types: API server + world worker (modular monolith)

**Status:** accepted

**Context.** The world must keep running with no players online; NPCs and
events need a clock independent of requests.

**Decision.** `apps/worker` runs the world tick loop and scheduled jobs. A
PostgreSQL advisory lock elects a single leader per world; extra workers are
standbys. Everything else is in one codebase and one image.

**Alternatives.** Microservices (operational overhead far beyond current
needs). Ticking inside the API server (couples simulation to request load and
duplicates ticks when scaling the API).

**Revisit when.** One tick loop cannot process the world in time: partition by
region (one lock per partition).

---

## ADR-011 — Hexagonal world map with axial coordinates

**Status:** accepted (game design decision by the project owner)

**Decision.** The world map is a hex grid. Positions are axial `(q, r)`,
pointy-top; utilities are in `game-core/hex.ts`. Moving between hexes will cost
Action Points (amount to be defined; mechanic not implemented in phase 1).

---

## ADR-012 — Many characters per account, one active at a time

**Status:** accepted (game design decision by the project owner)

**Decision.** Accounts may own several characters (default limit 5, set by
`MAX_CHARACTERS_PER_ACCOUNT`). Only one may be in the world at a time per
account: entering with a new connection replaces the old one cluster-wide (WS
close code `4002`). The limit is enforced transactionally (account row lock).

---

## ADR-013 — One shared world, modelled as `world_id` everywhere

**Status:** accepted (game design decision by the project owner)

**Decision.** All players share a single world. All in-world data still
carries `world_id`, so test worlds, seasonal worlds or sharding remain
possible without a schema rewrite.

---

## ADR-014 — English-only game content

**Status:** accepted (game design decision by the project owner)

**Decision.** All player-facing text is English. No i18n framework for now;
strings stay in components. Error _codes_ (not messages) are the client/server
contract, so translation can be added later without API changes. In-game
"languages" (a game mechanic) are unrelated to UI language.

---

## ADR-015 — Character creation in phase 1: name + placeholder appearance

**Status:** accepted (agreed with the project owner)

**Decision.** Characters have a name (3–20 letters with single spaces,
apostrophes or hyphens; unique per world, case-insensitive) and a placeholder
appearance (`{version: 1, color, emblem}`). Origin, nation, attributes and
real appearance are deferred to the phases that design those systems. Deleted
characters are soft-deleted (their history remains) and their name is freed.

---

## ADR-016 — Testing against real PostgreSQL and Redis

**Status:** accepted

**Decision.** Integration tests run against real services (a separate test
database and Redis DB 15), not mocks. E2E tests use Playwright against the real
stack.

**Why.** The behaviours that matter most (unique constraints, row locks,
transactions, pub/sub) do not exist in mocks. CI provides both services.

---

## ADR-017 — One container image, three entrypoints

**Status:** accepted

**Decision.** `infra/Dockerfile` produces one image containing `server.js`
(which also serves the built SPA when `WEB_DIST_DIR` is set), `worker.js` and
`migrate.js`. Server and worker are esbuild bundles, so the runtime image needs
almost no `node_modules`.

**Consequences.** One artifact per release. Same-origin hosting removes CORS
and simplifies cookies. The SPA can move to a CDN later by setting
`WEB_ORIGIN` accordingly.

---

## ADR-018 — Hosting on Railway

**Status:** accepted (approved by the project owner)

**Context.** The owner's machine cannot run Docker Desktop easily, and the
owner mainly needs to _see and play_ the game; development and tests run in
the AI session. Cloudflare was considered, but Workers/Pages cannot run a
long-lived Node.js server with WebSockets, the world worker, PostgreSQL or
Redis without rewriting the backend for their runtime.

**Decision.** Deploy to Railway: managed PostgreSQL + Redis, and two services
(`server`, `worker`) built from `infra/Dockerfile`, configured as code in
`infra/railway/*.json`. Migrations run as the server's pre-deploy command.
Automatic deploys from `main`.

**Consequences.** No local infrastructure is needed to try the game. Hosting
costs a few dollars a month at this stage. The Docker image stays portable
(Render, Fly.io, any VPS). The Redis client resolves IPv4 and IPv6
(`family: 0`) because private networks may be IPv6. Cloudflare can later sit in
front for the domain, DNS and DDoS protection.
