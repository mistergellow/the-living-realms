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

## Phase 3 — Combat and Rifts 🔜 (M2 + Combat 2.0 + M3 + The Rift done)

Rifts are portals that lead to raids. A player enters **solo or with a lobby**;
**difficulty does not change** with the number of players.

- [x] **M2 done:** deterministic combat engine (2 rows × 3 slots per side, initiative, Focus with carry-over, row targeting, swap, enemy AI, rooms → boss, revive at 1 HP); Rift runs persisted every action; 60 s turn timer; rewards (reputation + drops) and defeat penalty (−25% quality); side-view combat screen with animations; layered SVG characters with an editable base body
- ❓ Rift structure (encounters, waves, boss), lobby size, defeat and rewards
- Combat instances (server state machine, persisted every turn)
- [x] **Combat 2.0:** six linear attributes (12 creation points, unspent points can be spent later), weapons scaling with two attributes, main + off-hand combinations (6 starter weapons, 3 off-hands), diminishing-returns armor/resistance, Block, statuses (Bleed, Burn, Mark, Weaken, Stun), damage ranges, visible enemy intents; rebalanced by simulation
- [x] **Column attacks (D41/D42):** attacks pick a column and hit both units; enemies play the formation (Rift Bulwark shields its column); rebalanced with `pnpm sim`
- [x] **Formation fix (D38):** 3 columns (front, mid, back) × 2 lines per side, column-based reach and areas
- [x] **M3 done:** friends (requests by character name, online status); lobbies up to 6 (public or invite-only, invites to friends, formation slots, ready check, kick, leader hand-over, leader starts for everyone); group combat (initiative across players, leaving penalises only the leaver); live refresh by polling
- [x] Combat screen rendered with PixiJS (animated stage, layered characters, projectiles, effects; ADR-029)
- [x] **The Rift (request #31):** dungeons with a procedural branching map (≥ 10 rooms, converging branches, optional rooms, hidden secret rooms, boss); Combat, Elite, Campsite, Random Event, Loot, Secret and Boss rooms; events with attribute tests on BASE stats; lasting debuffs/boons; group votes; rewards mostly after the boss
- [x] **Combat rounds (request #31):** planning phase + alternating resolution by team initiative (roll + Agility), Focus from Precision (min 3, carry-over with a cap), 1-Focus Block (stacks, resets each round), 1-Focus change of position
- [x] **Weapon catalogue (request #31):** sword, axe, dagger, spear, mace, bow, staff, wand (+ tome); identical stats per type and level; upgrades; 5 special slots and 2 locked rune slots (data only)
- [x] **Request #33:** basic attack cost per weapon (heavy 3, dagger 1); a wiped party keeps no Rift loot; simple Dungeon Threat; PvP arena (test mode, lobby with two teams)
- [x] **Item cards (request #37):** bonus effects on all gear (up to 5; attributes, derived stats, offensive %, combat effects), rarity by effect count, BASE-attribute requirements, rune slots shown when unlocked; drops roll effects (ADR-041)
- [x] **Admin tools (request #41, ADR-044):** `/admin` for accounts in `ADMIN_EMAILS` — create/edit custom weapons, items and abilities; give items, teach abilities and change attributes/reputation of any character
- ❓ Full Dungeon Threat design (ADR-035); Runemaster and runes content; bonus-effect balance (A67–A69); PvP rewards/ranking
- Enemy AI; combat log and replay from `game-core`
- First playable test Rift to tune numbers

## Phase 4 — The world map and movement ⏳ ❓

Bring the hex world to life for exploration (Rifts placed on the map).

- [x] Hub (home screen) with the in-game shell (top bar, bottom navigation); MMO-style ability bar with tooltips (request #30)
- [x] **Request #40:** the game opens with the last character played on the hex where it stopped; hex screen with the place's picture and actions (starting town Emberhold; other hexes are open wilds); 2 character slots
- [x] One continent, 4 regions: nations west, east and north, the neutral Rift-infected Riftlands in the middle; one capital hex per nation (placeholders, request #36, ADR-040)
- [x] Terrain (plains, forest, river, mountains with mines); gathering needs the right terrain; Rift entrances on hexes, harder towards the heart of the Riftlands (request #43, ADR-046)
- [x] Nation of origin at creation; start in its capital (request #43)
- [x] World boss: one per season, roams the Riftlands, shared HP, party damage leaderboard (request #43)
- ❓ Points of interest, NPCs, more terrain kinds; world boss rewards
- [x] Action Points: max 120, +10 per real hour; travel to any land hex for AP × distance (request #43, ADR-045)
- ❓ AP cost per terrain / per activity (professions, Rifts)
- `map_regions` / `map_hexes` tables, a map seeding/import tool
- Movement intents (server-validated pathing and AP cost), position broadcast
- Area-of-interest: clients receive only nearby activity
- [x] Map rendered with PixiJS: pan (drag, keys), zoom (wheel, pinch, buttons), recenter (ADR-029)
- Map rendering: terrain, fog of war (if desired)

## Phase 5 — Social layer and reputation ⏳ ❓

- [x] Hex chat (request #40): everyone on the same hex, recent history on arrival
- Chat (region, global, private), with moderation basics
- Player inspection, interaction menu
- [x] Rift reputation decreases per repeat clear (100/50/25/0 %); equipped gear adds a bonus (request #49)
- ❓ Reputation from professions and other sources; what reputation buys
- ❓ How in-game languages affect communication (ties into phase 6)
- Account security additions: email verification, password reset (needs an email provider)

## Phase 6 — Nations, languages and diplomacy ⏳ ❓

- ❓ Which nations exist, how players join or found them, governance
- Nation membership, diplomatic states between nations
- In-game languages and proficiency

## Phase 7 — Economy, professions and trade ⏳ ❓

- [x] **Professions (request #33):** professions with materials that stack, crafting and repairs
- [x] **Professions & Economy — phase 1 (request #51, `docs/PROFESSIONS_ARCHITECTURE.md`):** the spec's 15 professions (5 gathering, 10 crafting), independent Mastery with 6 ranks and complexity-based progress, recipes unlocked by rank, tools as items (basic and fine), BASE-attribute bonus (§21), profession screen with Gathering/Crafting Mastery, statistics and history, other players' profiles
- [ ] Phase 2: gathering nodes, regeneration, AP for gathering, material quality
- [ ] Phase 3: crafting quality, recipes found/bought/discovered, public facilities and fees, processing
- [ ] Phase 4: player economy (regional market, orders, trading, commissions, shops, professional reputation)
- [ ] Phase 5: private and guild workshops · Phase 6: book duplication, rare resources, profession events
- Consumables usable in the Rift (food, draughts, bandages); runes from rune stones
- [x] **Character sheet (request #39):** tabs (Equipment / Abilities / Professions); 8 equipment slots (boots, 2 rings, pendant); drag-and-drop inventory with item tooltips; 8 prepared skills + weapon abilities + Block/Swap
- Skill books (learn skills from books); weapon ability count per weapon (2?) to be decided

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
