# ADR-020 — Game content as typed data in `game-core`; derived stats computed

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
