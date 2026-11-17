# Roadmap

Development happens in phases. Each phase ends with a working, tested build.
The order after phase 1 is a **proposal**: it is to be confirmed with the
project owner, and every phase starts by settling its game-design decisions.

Legend: ✅ done · 🔜 next · ⏳ planned · ❓ needs design decisions

---

## Phase 1 — Technical foundation ✅

- [x] Monorepo (pnpm workspaces, TypeScript, ESLint, Prettier)
- [x] PostgreSQL schema + migrations (accounts, sessions, worlds, characters, world_events)
- [x] Redis integration (pub/sub bus, presence, rate limiting)
- [x] Registration, login, logout, sessions (Argon2id, HttpOnly cookies)
- [x] Character creation, listing and deletion (name + placeholder appearance; limit per account)
- [x] Real-time gateway (authenticated WebSocket, typed protocol, multi-instance fan-out)
- [x] One active character per account (cluster-wide)
- [x] World worker (tick loop, leader election, maintenance jobs)
- [x] Web client: auth screens, character select/create, world shell (hex map, online players, chronicle)
- [x] Hex grid utilities (axial coordinates)
- [x] Security baseline (CSRF/Origin, rate limits, headers, input validation, log redaction)
- [x] Tests: unit, integration (real DB/Redis), end-to-end (Playwright)
- [x] CI workflow, Dockerfile, production compose example
- [x] Railway deployment configuration (`infra/railway/`, guide in `docs/DEPLOY_RAILWAY.md`) — live on Railway
- [x] Documentation (README, ARCHITECTURE, DATABASE, DECISIONS, ROADMAP)

## Phase 2 — Character system ✅ (M1)

Priority set by the project owner: characters and combat come before the world
map, because combat is the core of the game.

- ❓ What defines a character's power (attributes, skills, equipment, reputation)
- ❓ Archetypes/classes or a free build; how skills are learned and equipped (loadout)
- ❓ Combat resources (HP, energy/mana, …)
- [x] **M1 done:** six D&D attributes with point-buy; derived stats; items with quality/durability; equipment with 7 slots (two-handed rules, attribute bonuses); weapons grant abilities; learned-skills table; per-character reputation; starter weapon choice + starter kit; character sheet screen
- [x] Data-driven definitions (items, abilities) so numbers can be tuned quickly

## Phase 3 — Combat and Rifts 🔜 ❓

Rifts are portals that lead to raids. A player enters **solo or with a lobby**;
**difficulty does not change** with the number of players.

- ❓ Battlefield (grid or rows), turn order, actions per turn, turn timer
- ❓ Rift structure (encounters, waves, boss), lobby size, defeat and rewards
- Combat instances (server state machine, persisted every turn)
- Lobby system (create, invite/join, ready check, start)
- Separate combat screen and renderer (`/combat/:id`)
- Enemy AI; combat log and replay from `game-core`
- First playable test Rift to tune numbers

## Phase 4 — The world map and movement ⏳ ❓

Bring the hex world to life for exploration (Rifts placed on the map).

- ❓ World size and shape, terrain types, regions, points of interest, starting area
- ❓ Action Points: pool size, regeneration, AP cost per hex / per terrain
- `map_regions` / `map_hexes` tables, a map seeding/import tool
- Movement intents (server-validated pathing and AP cost), position broadcast
- Area-of-interest: clients receive only nearby activity
- Map rendering: terrain, fog of war (if desired), panning/zoom

## Phase 5 — Social layer and reputation ⏳ ❓

- Chat (local hex/region, global, private), with moderation basics
- Player inspection, interaction menu
- ❓ Reputation model (tracks, sources, decay, effects) in place of levels
- ❓ How in-game languages affect communication (ties into phase 6)
- Account security additions: email verification, password reset (needs an email provider)

## Phase 6 — Nations, languages and diplomacy ⏳ ❓

- ❓ Which nations exist, how players join or found them, governance
- Nation membership, diplomatic states between nations
- In-game languages and proficiency

## Phase 7 — Economy and trade ⏳ ❓

- ❓ Currency, resources, crafting/production, sinks and faucets
- Items and inventories, double-entry ledger
- Player-to-player trade, markets (transactions, row locks, idempotency keys)

## Phase 8 — Living world: NPCs and world events ⏳ ❓

- ❓ NPC roles, schedules, behaviours; which events can change the world and how
- Region-based NPC simulation in the worker (awake/dormant regions)
- Scheduled and emergent world events, world chronicle UI built on `world_events`
- Quests (❓ design)

## Phase 9 — Scale and operations ⏳

Can start earlier, driven by real load.

- Metrics and dashboards (connected players, tick time, latency), error tracking
- Load testing of the WebSocket layer; region-based bus channels
- Worker partitioning by region; PgBouncer; read replicas
- Admin/moderation tools, backups and restore drills, staging environment
