# Professions & Economy — architecture review and plan (request #51)

This is the architecture review asked for by the Professions & Economy spec
(sections 1–21). It lists what already exists, what is reused, the conflicts
found, and the plan in six phases. **Phase 1 is implemented** (see the end of
this file). All numbers are provisional (`docs/REQUESTS.md`, A111–A116).

## 1. What already exists (and is reused, not rebuilt)

| System                                | Where                                                                                                                      | Reused for                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Professions (request #33)             | `game-core/content/professions.ts`, `game-core/professions.ts`, `server/modules/professions/`, `web/features/professions/` | Base of the new system. Same data-driven activities, same service and screen. |
| Items, stacks, bag of 20, storage     | `content/items.ts`, `characters/bag.ts` (`giveItem`, `assertBagRoom`), `items.in_storage`                                  | Every item that comes in goes through `giveItem`. Tools are items.            |
| BASE vs gear attributes               | `baseAttributesOf(c)` (`sheet.service.ts`)                                                                                 | §21: only BASE attributes affect profession checks.                           |
| Action Points                         | `characters.ap`, `spendAp` (`characters/ap.ts`), `AP_RULES`                                                                | Phase 2: gathering costs AP.                                                  |
| Terrain of hexes                      | `GATHERING_TERRAIN`, `mapHexAt`                                                                                            | Gathering stays tied to terrain; nodes come in phase 2.                       |
| Gold, city store, storage, blacksmith | `characters.gold`, `city.service.ts`, `SHOP_STOCK`, `npcSellPrice`                                                         | Basic tools are sold in the store; NPCs never buy materials (§15).            |
| Reputation                            | `characters.reputation`, `content/reputation.ts`                                                                           | Phase 4: professional reputation is a separate track, not this one.           |
| World events                          | `world_events`                                                                                                             | Rank-ups (`profession.rank_up`) and the profession history.                   |
| Skill books                           | `SKILL_BOOKS`                                                                                                              | Phase 6: Scribing duplicates books.                                           |

## 2. Conflicts found and how they were solved

| Conflict                                                                                                                                              | Decision                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The old list had 15 professions but not the spec's 15 (Farming and Medicine extra; Crafter and Scribing missing; "Runesmithing", "Blacksmithing" ids) | Ids now: `hunting, fishing, herbalism, woodcutting, mining` + `crafter, blacksmith, runecrafter, carpentry, leatherworking, tailoring, jewelcrafting, alchemy, cooking, scribing`. Farming merged into Herbalism (grain and flax are plants). Medicine merged into Tailoring (bandages are cut linen). `RENAMED_PROFESSIONS` + migration 0016 move the rows; when a character had both, the better row wins. |
| Levels 0–10 + XP vs 6 Mastery ranks                                                                                                                   | Ranks 0–5 (Novice … Grandmaster). Old levels → ranks: 0–2 Novice, 3–5 Apprentice, 6–8 Journeyman, 9–10 Expert. The DB columns keep their names (`level` = rank index, `xp` = Mastery points) so no column rename is needed.                                                                                                                                                                                  |
| "Farming cheap items must not reach Grandmaster"                                                                                                      | Every activity has a `complexity` (1–6). Points fall off by how far your rank is above it: 100 %, 50 %, 15 %, then 0. Novice work stops teaching at Expert.                                                                                                                                                                                                                                                  |
| Weapon upgrades existed in both the Blacksmith profession and the city blacksmith                                                                     | Already solved in #50: only the city blacksmith upgrades. The profession keeps smelting and repairs.                                                                                                                                                                                                                                                                                                         |
| Cooldowns (`ready_at`) vs AP for gathering                                                                                                            | Phase 1 keeps the cooldown. Phase 2 replaces it with AP for gathering; crafting will cost no AP (spec).                                                                                                                                                                                                                                                                                                      |
| "Service" category                                                                                                                                    | Removed: the spec has gathering and crafting only.                                                                                                                                                                                                                                                                                                                                                           |
| Tools must not replace Mastery                                                                                                                        | Tools are required to gather (except Herbalism) and give +5 % per tier above 1; one rank gives +10 %. Fine tools need Apprentice to use.                                                                                                                                                                                                                                                                     |
| BASE attributes (§21)                                                                                                                                 | Weights per profession (`ProfessionDef.attributes`, adding up to 1), `PROFESSION_ATTRIBUTE_RULES` (1 % per weighted point above 5, max 8 %, less than one rank). Computed only on the server from `baseAttributesOf`.                                                                                                                                                                                        |
| New characters have no gold to buy tools                                                                                                              | Every character gets the four basic tools (new ones at creation, existing ones in migration 0016). Provisional (A113).                                                                                                                                                                                                                                                                                       |

## 3. Data model

Phase 1 (done):

- `character_professions` (existing): `level` → Mastery rank 0–5 (check
  constraint `character_professions_rank_range`), `xp` → Mastery points, new
  `attempts`, `successes`, `items_made` for the statistics.
- `items` (existing): tools are items with `kind = 'tool'`; their data
  (`type`, `tier`, `minRank`) lives in game-core (`ItemDef.tool`).
- `world_events` (existing): `profession.rank_up` {professionId, rank}.

Later phases (proposed):

| Phase | Table                                                                                                 | Purpose                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 2     | `resource_nodes` (world_id, hex_q, hex_r, resource, quality, amount, max, regen_per_hour, updated_at) | Nodes on hexes with lazy regeneration (same pattern as AP: stored value + time).                              |
| 2     | `items.material_quality` (Poor … Exceptional) or a quality column reused                              | Material quality from gathering.                                                                              |
| 3     | `character_recipes` (character_id, recipe_id, source: purchased/found/discovered)                     | Recipes unlocked outside ranks.                                                                               |
| 3     | `facilities` (content) + fees in gold                                                                 | Public workshops in capitals.                                                                                 |
| 4     | `market_orders`, `trades`, `commissions`, `gold_ledger`                                               | Regional market, trading, commissions; double-entry ledger, row locks and idempotency keys (ROADMAP phase 7). |
| 4     | `profession_reputation` (character_id, profession_id, value)                                          | Professional reputation.                                                                                      |
| 5     | `workshops` (owner character or guild, region, level)                                                 | Private and guild workshops.                                                                                  |
| 6     | `unique_resources`, `profession_events`                                                               | Rare resources and events.                                                                                    |

## 4. Endpoints

Phase 1 (done):

- `GET /api/characters/:id/professions` — your 15 professions: rank, points,
  tool, attributes and bonus, statistics, resources, history, recipes
  (unlocked and not yet unlocked).
- `POST /api/characters/:id/professions/:professionId/activities/:activityId`
  — practise (checks: not in a Rift, terrain, rank, cooldown, tool, materials).
- `GET /api/characters/:id/professions/profile` and
  `GET /api/characters/by-name/:name/professions/profile` — another
  character's public profile (ranks, progress, statistics only).

Later: `GET /api/world/nodes?q&r` (2), `POST …/city/workshop/:recipe` with a fee
(3), `/api/market/*`, `/api/trades/*`, `/api/commissions/*` (4),
`/api/workshops/*` (5).

## 5. Services

- `ProfessionsService` (existing, extended): Mastery, tools, attributes,
  statistics, history, profiles.
- Phase 2: `ResourceNodesService` (read and deplete nodes, lazy regeneration),
  AP through `spendAp`.
- Phase 3: crafting quality, recipes, facilities (inside `ProfessionsService`
  or a `CraftingService` if it grows).
- Phase 4: `MarketService`, `TradeService`, `CommissionsService`, and one
  `GoldLedger` helper that every gold change goes through.

## 6. Interface

- `/professions`: two sections, **Gathering Mastery** and **Crafting Mastery**.
  Each profession shows its rank (six-step ladder), progress, tool, helping
  attributes and bonus, statistics, resources, recipes (unlocked, and "not
  unlocked yet" with the rank that unlocks them), history and a placeholder
  for commissions (phase 4).
- `/professions/inspect/:name`: another player's profile (search box on the
  Professions page; "Professions" link next to each friend).
- Item tooltips show a tool's type, tier and required rank; the bag has a
  "Tools" filter.

## 7. Files changed in phase 1

- game-core: `content/professions.ts`, `professions.ts`, `content/items.ts`
  (`TOOLS`, `STARTER_TOOLS`, `ItemDef.tool`, parchment, ink, blank scroll),
  `content/economy.ts` (tools in `SHOP_STOCK`); tests.
- shared: `professions.ts` (DTOs), `api.ts` (`ItemKind` `tool`, `ItemDto.tool`).
- db: `schema.ts`, migration `0016_profession_mastery.sql` (data migration
  included).
- server: `professions.service.ts`, `professions.routes.ts`,
  `characters.service.ts` (starter tools), `sheet.service.ts` (`ItemDto.tool`);
  tests.
- web: `ProfessionsPage.tsx`, `InspectPage.tsx`, `api.ts`, `professions.css`,
  `router.tsx`, `FriendsPage.tsx`, `ItemIcon.tsx`, `ItemTooltip.tsx`,
  `EquipmentTab.tsx`; e2e.

## 8. Plan

| Phase | Content                                                                                                                                                          | Depends on     | Status  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------- |
| 1     | 15 professions, independent Mastery (6 ranks, complexity), recipe unlocks by rank, profession interface, tools and requirements, BASE attributes (§21), profiles | —              | ✅ done |
| 2     | Gathering nodes on hexes, regeneration, AP cost for gathering, material quality                                                                                  | 1              | next    |
| 3     | Crafting quality (materials + Mastery), recipes found/bought/discovered, public facilities with fees, processing chains                                          | 2              |         |
| 4     | Player economy: regional market, cross-region orders, trading, commissions, player shops, professional reputation, gold ledger                                   | 3              |         |
| 5     | Private and guild workshops                                                                                                                                      | 4 (and guilds) |         |
| 6     | Book duplication (Scribing), rare and unique resources, profession events                                                                                        | 3–5            |         |

Each phase ends with unit, integration and e2e tests, as in phase 1.
