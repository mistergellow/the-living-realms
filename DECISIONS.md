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
_(Update: the combat screen and the world map now render with PixiJS — ADR-029.)_

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

---

## ADR-019 — Apply migrations at process startup (advisory-locked)

**Status:** accepted

**Context.** Relying on the host's pre-deploy hook proved fragile: on the first
Railway deploys the hook did not run and the server crashed on missing tables.

**Decision.** `server` and `worker` call `migrateWithLock()` on boot
(`MIGRATE_ON_START`, default `true`). A PostgreSQL advisory lock serialises
concurrent starts; already-applied migrations are skipped. `migrate.js` stays
for manual or CI use, and the flag can be turned off if a platform runs
migrations separately.

**Consequences.** The app works on any host with no extra deploy step. A
migration error stops the process before it serves traffic (the previous
healthy deployment keeps running). Long, locking migrations must be avoided
or run manually during maintenance.

---

## ADR-020 — Game content as typed data in `game-core`; derived stats computed

**Status:** accepted

**Context.** Weapons define attacks, equipment changes attributes, and numbers
will be tuned often during combat playtesting.

**Decision.** Item and ability definitions are TypeScript data in
`packages/game-core/src/content/`. The database stores instances only
(`items.item_def_id`, `character_skills.skill_id`). Derived stats (HP, mana,
defense, initiative, dodge, crit, powers) are computed by `computeStats()` from
base attributes plus equipped, non-broken items, and are never persisted. Stat
formulas live in one table (`STAT_RULES`).

**Consequences.** Content changes are code-reviewed, type-checked and shared
by client and server; a deploy is needed to change content. Renaming or
removing a definition id requires a data migration. If content grows large or
non-developers must edit it, move definitions to the database or JSON files
behind the same accessors (`getItemDef`, `getAbility`).

---

## ADR-021 — Provisional character art as layered SVG ("paper doll")

**Status:** accepted (provisional art)

**Context.** The owner wants illustrated, animated characters in the style of
the reference they sent (chibi heroes, equipment around the character), with
an editable base body now and visible equipment later (D32). There is no art
pipeline or artist yet.

**Decision.** Characters are drawn in code as layered SVG
(`apps/web/src/features/avatar/CharacterAvatar.tsx`): back hair, legs, torso,
arms, weapon, head, face, front hair. Appearance v2 stores only choices
(body, skin, hair style/colour, eyes, outfit colour). Idle animations
(breathing, bobbing, blinking) and combat animations (lunge, hit flash,
floating numbers, falling) are CSS. Enemies have their own SVG art.

**Consequences.** No asset pipeline is needed and everything scales and
recolours freely. The quality is far below professional illustration: real
artwork (static layers or a skeletal animation tool such as Spine) can replace
each layer behind the same component. Equipment will be added as extra layers
on the same anchors. Appearance v1 (emblem) characters are converted with
`normalizeAppearance`.

_Update (ADR-029):_ in the combat screen and on the map the same SVG layers
are rasterised into PixiJS textures and animated there; the CSS animations
remain for the DOM uses (sheet, lists, editor).

---

## ADR-022 — Rift runs: JSON combat state, row locks, lazy turn timers

**Status:** accepted

**Decision.** A run's whole `CombatState` is one JSONB document in
`rift_runs`, updated in a transaction that locks the row. Turn timeouts are
applied lazily on read/act (catching up missed turns). Solo actions use HTTP.

**Why.** Turn-based combat changes state only on player actions or timeouts,
so a document per run is simple, consistent and easy to replay. Row locks
serialise actions from several participants (M3). Lazy timers avoid a
scheduler for solo play.

**Revisit when.** Lobbies (M3): push updates over the WebSocket bus and add a
worker sweep for expired turns, so the other participants see a timeout
without having to act.

---

## ADR-023 — Six linear attributes and diminishing-returns mitigation (replaces D&D attributes)

**Status:** accepted (supersedes the D&D attribute part of M1)

**Context.** The owner found the D&D abilities a poor fit and the balance
swingy: D&D modifiers make most points meaningless, CHA/WIS were near-dead
stats, there are no levels to recover from a bad build, and flat armor made
small hits worthless and large hits barely affected.

**Decision.** Six attributes with linear effects (Might, Agility, Precision,
Vitality, Arcana, Spirit); base 5, 12 creation points, max 10 from points;
equipment adds more. Each weapon scales with two attributes; main and off-hand
abilities combine. Mitigation uses `reduction = rating / (rating + 50)` (each
point adds the same effective HP; never 100%), plus active Block. Damage uses
ranges. Existing characters were reset to 5s with 12 unspent points.

**Consequences.** Build variety comes from attribute × weapon × off-hand ×
status synergies rather than from attributes alone; balance is tuned against
simulation targets (A23). Formulas live in `STAT_RULES`.

---

## ADR-024 — Enemy intents planned at round start

**Status:** accepted (D36)

**Decision.** At the start of each round, each enemy plans its whole turn
(abilities and targets) with the Focus it will have; the plan is part of the
combat state and shown to players. During the enemy phase the plan is executed;
if a planned target is gone the enemy re-targets with its usual rule.

**Why.** Telegraphed enemy actions are what make "Slay the Spire" decisions
tactical (block now, kill the biggest threat, weaken the attacker).

---

## ADR-025 — Lobbies and group combat refresh by polling (for now)

**Status:** accepted (provisional, A29)

**Context.** Lobbies and group runs need other players' changes to appear
quickly. The WebSocket gateway exists but is tied to the world screen.

**Decision.** Clients poll the lobby (1.5 s while open) and the run (1.5 s while
waiting, 4 s during their own turn). Reads apply expired turn timers, so
timeouts happen without a background job.

**Why.** Simple, stateless and robust to reconnects; at up to 6 players per
group the load is negligible. **Revisit when** player counts grow or latency
matters more: push `lobby.updated` / `run.updated` notifications over the
existing Redis bus and WebSocket, keeping the same HTTP API.

---

## ADR-026 — Friends between characters

**Status:** accepted (provisional, A25)

**Decision.** Friendships link characters (added by character name), stored
once per pair with ordered ids. Online = in the world, in an open lobby or in
an active Rift.

---

## ADR-027 — Formation: 3 columns × 2 lines per side

**Status:** accepted (D38; corrects the earlier "2 rows of 3" reading of D13)

**Decision.** Each side has three depth columns — front, mid, back — with two
lines each. Slots: 0–1 front, 2–3 mid, 4–5 back (even = top line). Abilities
declare a reach: `first` (the first occupied column; melee), `any`, or specific
columns; and an area: one target, a whole column (both lines) or everyone.
`columnOfSlot` in `@realms/shared` is the single source of truth.

**Consequences.** Column attacks hit at most 2 units; positioning across three
depths matters (mid is safe from melee while the front holds). Existing lobby
slots and active runs keep their numbers but are read with the new meaning.

---

## ADR-028 — Attacks target columns; enemies play the formation

**Status:** accepted (D41, D42)

**Decision.** Every attack picks a column (front, mid or back within its reach)
and hits both units in it; abilities that hit everything remain. Support
abilities on allies still pick one ally. Enemy AI scores each reachable column
and values Block more when it shares a column with a partner, so tanks such as
the Rift Bulwark shield their column while the other enemy attacks. Formations
are authored per Rift room, so harder Rifts can field smarter formations.

**Consequences.** Positioning both sides matters (stacking two units in a
column doubles exposure but enables column Block). Damage values were
rebalanced: melee hits harder than ranged/magic, which can reach any column.

---

## ADR-029 — PixiJS for the combat screen and the world map

**Status:** accepted

**Context.** The game looked like a web page: combat and the map were DOM/SVG
with CSS animations. The owner asked whether to use Phaser (suggested
elsewhere) and approved PixiJS for combat and the map (request #20).

**Decision.**

- **PixiJS 8** draws the combat stage and the hex map. React keeps every menu,
  panel and button. Phaser was not chosen: its scenes, physics and input
  systems duplicate what React and the server already do; we only need a fast
  2D renderer.
- **Loaded lazily:** `features/render/pixi-app.ts` is a dynamic import, so the
  login, character and sheet screens do not download Pixi. The Vite dev server
  pre-bundles it (`optimizeDeps`) to avoid mid-session reloads.
- **One source of art:** the SVG components (`features/avatar`) are rendered
  to markup (`react-dom/server`) and rasterised into cached textures
  (`render/avatar-textures.tsx`), one per layer (body, weapon, head, blink
  frame). Real artwork or Spine can later replace these textures.
- **Input stays in the DOM:** the combat canvas has `pointer-events: none`;
  transparent buttons placed from the same layout (`rifts/combat-layout.ts`)
  carry clicks, focus, accessible names and test ids. The map handles drag,
  wheel and pinch on its host element, plus keyboard keys.
- **The server stays the truth:** the scene replays new combat log entries
  (`rifts/combat-timeline.ts`) one action at a time. The page holds the text
  log, the controls (during enemy actions) and the result overlays until the
  replay ends, so nothing is revealed before it is shown.
- **CSP:** no `unsafe-eval` (`pixi.js/unsafe-eval` is imported), images via
  `data:` URLs (no blob: or workers).
- **Fallback:** without WebGL, Pixi falls back to its Canvas 2D renderer
  (checked: everything draws; the hit-flash and greyed-out filters are
  skipped). If even that fails, combat shows the SVG art in the buttons and the
  map shows a message.
- **Frame rate:** 60 fps while something moves, 30 fps when idle.

**Consequences.** About 300 KB (gzip ≈ 100 KB) more JavaScript, only on the
map and combat screens. Pure parts (layout, timeline, camera, `pixelToHex`)
are unit-tested; the drawing itself is covered by the e2e combat test and
screenshots. Tests must close pages they open: an open world page keeps its
canvas rendering.

---

## ADR-030 — Game-styled UI: fluid rem scaling and full-screen layouts

**Status:** accepted

**Context.** Besides the canvas map and combat (ADR-029), the menus still
looked like a website. A theme was prepared in another session (paused before
the move to PixiJS) and merged on top of the current screens (request #29).

**Decision.** Self-hosted fonts (Cinzel for titles, Alegreya Sans for text)
through `@fontsource` packages, so no third-party font requests are needed
under the CSP. Every size in the UI is in `rem` and the root font size scales
with the viewport (`tokens.css`), so the same layout fits a phone and a 4K
monitor. Each screen is a full-viewport `Screen` (backdrop, embers, vignette)
whose page never scrolls; long content scrolls inside `screen-body`. Avatars
in the DOM are sized in `rem`; the canvas uses exact pixels (`inSvg`).

**Consequences.** An e2e test checks that no screen overflows at six viewport
sizes. New screens must use the same frame (see CHANGE_MAP → "Tema visual").

---

## ADR-031 — Hub and a shared in-game shell

**Status:** accepted

**Context.** The owner wants the look of a mobile RPG home screen (request
#30) and chose a hub as the entry screen, with the map opened from it.

**Decision.** A layout route (`GameShell`) wraps `/home`, `/world`, `/rifts`
and `/friends`. It owns the world WebSocket connection, the top bar and the
bottom navigation, so the player stays online and the connection is not
re-opened when moving between these screens. Character select/creation, the
sheet, lobbies and combat stay outside (own frames). Backdrop art is an
original placeholder SVG (`Landscape`) until real illustration exists.

**Consequences.** Pages inside the shell render content only. Presence now
covers the Rifts and Friends screens too. Tests navigate from the hub.

## ADR-032 — The Rift: a dungeon as a run state machine around combat

**Status:** accepted (request #31)

**Context.** A Rift used to be a fixed list of combat rooms. The owner wants a
Slay-the-Spire-style dungeon: a branching map with several room types,
optional rooms, secret rooms, events with attribute tests, campsites and loot,
playable solo or in a group of up to 6.

**Decision.** A new pure module `game-core/src/rift` wraps the existing combat
engine instead of replacing it. `RunState` (map, party, current room, combat
state, event, votes, granted items) is stored in the existing
`rift_runs.state` JSONB column with `version: 2`; the server keeps one row lock
per action, as before. The map is generated from a data template with
controlled rules and validated (regenerated deterministically when invalid).
Group decisions are votes (owner); hidden secret rooms are never sent to
clients. Exploration tests take a branded `BaseAttributes` type so only base
stats can be used (owner's fundamental rule). Old active runs were closed by
migration 0008. The map is drawn in SVG (React), not PixiJS: it is a static
diagram with real buttons; the combat stage stays on PixiJS (ADR-029).

**Consequences.** New room types, events and conditions are data. Fights
reuse `createEncounter` with exploration conditions applied. Items found
during a run go straight to the inventory (provisional, A43).

## ADR-033 — Combat rounds: planning phase + alternating resolution

**Status:** accepted (request #31, replaces the PvE turn order of D14)

**Context.** The combat spec asks for a round structure where players plan
first and actions resolve one at a time, alternating between teams, with team
initiative (roll + Agility), Focus generated from Precision (min 3) and a
1-Focus Block that stacks and resets every round.

**Decision.** The engine keeps its pure `(state, action) → state` shape but the
player actions became `plan`, `unplan` and `ready`. The party plan is one
ordered list (owner: each team resolves in planned order); enemy intents are
the enemy plan. `resolveRound` alternates the two queues; every action is
re-validated against the current battlefield (downed/stunned actors skip, Focus
re-checked, empty columns re-aim). Statuses count down per round. Focus carries
over up to a cap (owner). All numbers live in `COMBAT_RULES`, `FOCUS_RULES`,
`BASIC_ACTIONS` and `WEAPON_RULES`.

**Consequences.** Group play no longer waits on each player in turn: everyone
plans at the same time with one 60 s timer per round. The client replays the
whole resolution from the log.

## ADR-034 — Weapon catalogue with identical stats per type and level

**Status:** accepted (request #31)

**Decision.** `content/weapons.ts` defines each weapon type (hands, category,
primary/secondary attribute, attack type, base damage, basic attack). Weapon
ability scaling and basic attack damage are derived from it, so every weapon
of a type shares them. Instances store `upgrade_level` (+N multiplies the
weapon's ability values), `specials` (max 5) and `rune_slots` (2, locked).
No random rolls. Runes, rune effects, specials content and the Runemaster are
future features (data structure only).

## ADR-035 — Dungeon Threat: evaluated, not implemented

**Status:** superseded in part — a simple version was implemented in request
#33 (`THREAT_RULES`: failed event tests and timed-out votes raise it, clearing
an Elite lowers it; tiers strengthen the boss through `enemyModifiers`). The
open questions below still apply to the full design.

**Original status:** proposed (request #31, optional system)

**Evaluation.** It fits the current design cleanly: `RunState` could hold a
`threat` number raised by failed event tests, elite rooms skipped/fought,
time-outs or chosen risky approaches (event effect `{ kind: 'threat' }`), and
`createEncounter` already accepts modifiers for the party; the boss room would
read the threat and apply data-driven tiers (extra HP/power, an extra ability,
a starting status on the party, an extra enemy). Nothing in the engine blocks
it. **Open questions for the owner:** what raises (and lowers) Threat, whether
players see it, the tiers and their effects, and whether it changes rewards.
Not implemented until those are decided.

## ADR-036 — Professions: data-driven activities with levels

**Status:** accepted (request #33)

**Decision.** Professions and their activities are data
(`game-core/src/content/professions.ts`); the pure rules (`professions.ts`)
compute chance, yield, repairs, upgrades and XP from the level and a seed.
Levels live in `character_professions` (one row per practised profession).
Materials and consumables are items with `kind` `material`/`consumable` that
stack through `items.quantity`. Until Action Points exist, each attempt puts
the profession on a short cooldown (`ready_at`). Not available inside a Rift.

**Consequences.** New professions/activities/recipes are data only. Consumables
cannot be used yet; runes are only blank stones. Balance is provisional.

## ADR-037 — PvP test mode through lobbies

**Status:** accepted (request #33, test mode)

**Decision.** PvP reuses the combat engine: `createPvpEncounter` puts team B
on the `enemies` side as players; both teams plan at the same time; the queue
of each side holds its players' actions in planned order (and AI intents in
PvE). No revive; last team standing wins. Matches are created from a lobby
whose `riftId` is `pvp_arena` (slots 0–5 team A, 6–11 team B) and stored in
`rift_runs` as a `RunState` with `mode: 'pvp'`. The server hides the other
team's plan. No rewards and no equipment damage while it is a test.

## ADR-038 — PvE turns like Slay the Spire; PvP keeps planning

**Status:** accepted (request #34, replaces ADR-033 for PvE)

**Decision.** In PvE, `planAction` resolves a player's action at once;
`setReady` ends the player's turn and, when every player has ended it, the
enemies carry out their intents (ordered by initiative) and a new round
begins. No initiative roll in PvE. The party's Block is removed when a round
begins; the enemies' Block is removed when their phase begins, so it lasts
through the party's turn. PvP (`mode: 'pvp'`) keeps ADR-033: hidden plans and
alternating resolution by team initiative.

## ADR-039 — One line of 4 positions per side

**Status:** accepted (request #35, replaces ADR-027/D38's 3 × 2 formation)

**Decision.** Each side stands in one line of 4 positions (slot 0 front … 3
back), Darkest-Dungeon style; a party/lobby is 4 (PvP 4 v 4). The engine
keeps its "column" vocabulary: a column is now one position
(`COMBAT_COLUMNS = front, second, third, back`), so `area: 'column'` hits one
unit and reach `first`/`first2` mean the nearest one/two positions. Abilities
that used to hit a whole column use `reach: 'first2', area: 'all'`.
