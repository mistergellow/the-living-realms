# Architecture Decision Records (ADR)

One file per decision. Read only the ADR you need: this index is the map.
New decision → next number, file `NNN-short-slug.md`, add a row here.
Status lives inside each ADR; a superseded ADR keeps its file and says which one replaces it.

| ADR                                                             | Decision                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [ADR-001](001-typescript-across-the-whole-stack-pnpm.md)        | TypeScript across the whole stack, pnpm monorepo                                   |
| [ADR-002](002-react-spa-with-vite-no-ssr.md)                    | React SPA with Vite (no SSR framework)                                             |
| [ADR-003](003-state-management-tanstack-query-zustand.md)       | State management: TanStack Query + Zustand                                         |
| [ADR-004](004-fastify-on-node-js-22.md)                         | Fastify on Node.js 22                                                              |
| [ADR-005](005-plain-websockets-with-our-own-typed.md)           | Plain WebSockets with our own typed protocol (not Socket.IO or Colyseus yet)       |
| [ADR-006](006-server-authoritative-intents-pure-rules-in.md)    | Server-authoritative intents; pure rules in `game-core`                            |
| [ADR-007](007-postgresql-as-the-source-of-truth.md)             | PostgreSQL as the source of truth; Drizzle ORM                                     |
| [ADR-008](008-redis-for-ephemeral-cross-process-data.md)        | Redis for ephemeral, cross-process data only                                       |
| [ADR-009](009-opaque-server-side-sessions-in-httponly.md)       | Opaque server-side sessions in HttpOnly cookies (not JWT)                          |
| [ADR-010](010-two-process-types-api-server-world.md)            | Two process types: API server + world worker (modular monolith)                    |
| [ADR-011](011-hexagonal-world-map-with-axial-coordinates.md)    | Hexagonal world map with axial coordinates                                         |
| [ADR-012](012-many-characters-per-account-one-active.md)        | Many characters per account, one active at a time                                  |
| [ADR-013](013-one-shared-world-modelled-as-world.md)            | One shared world, modelled as `world_id` everywhere                                |
| [ADR-014](014-english-only-game-content.md)                     | English-only game content                                                          |
| [ADR-015](015-character-creation-in-phase-1-name.md)            | Character creation in phase 1: name + placeholder appearance                       |
| [ADR-016](016-testing-against-real-postgresql-and-redis.md)     | Testing against real PostgreSQL and Redis                                          |
| [ADR-017](017-one-container-image-three-entrypoints.md)         | One container image, three entrypoints                                             |
| [ADR-018](018-hosting-on-railway.md)                            | Hosting on Railway                                                                 |
| [ADR-019](019-apply-migrations-at-process-startup-advisory.md)  | Apply migrations at process startup (advisory-locked)                              |
| [ADR-020](020-game-content-as-typed-data-in.md)                 | Game content as typed data in `game-core`; derived stats computed                  |
| [ADR-021](021-provisional-character-art-as-layered-svg.md)      | Provisional character art as layered SVG ("paper doll")                            |
| [ADR-022](022-rift-runs-json-combat-state-row.md)               | Rift runs: JSON combat state, row locks, lazy turn timers                          |
| [ADR-023](023-six-linear-attributes-and-diminishing-returns.md) | Six linear attributes and diminishing-returns mitigation (replaces D&D attributes) |
| [ADR-024](024-enemy-intents-planned-at-round-start.md)          | Enemy intents planned at round start                                               |
| [ADR-025](025-lobbies-and-group-combat-refresh-by.md)           | Lobbies and group combat refresh by polling (for now)                              |
| [ADR-026](026-friends-between-characters.md)                    | Friends between characters                                                         |
| [ADR-027](027-formation-3-columns-2-lines-per.md)               | Formation: 3 columns × 2 lines per side                                            |
| [ADR-028](028-attacks-target-columns-enemies-play-the.md)       | Attacks target columns; enemies play the formation                                 |
| [ADR-029](029-pixijs-for-the-combat-screen-and.md)              | PixiJS for the combat screen and the world map                                     |
| [ADR-030](030-game-styled-ui-fluid-rem-scaling.md)              | Game-styled UI: fluid rem scaling and full-screen layouts                          |
| [ADR-031](031-hub-and-a-shared-in-game.md)                      | Hub and a shared in-game shell                                                     |
| [ADR-032](032-documentation-split-for-cheap-navigation.md)      | Documentation split for cheap navigation                                           |
