# ADR-013 — One shared world, modelled as `world_id` everywhere

**Status:** accepted (game design decision by the project owner)

**Decision.** All players share a single world. All in-world data still
carries `world_id`, so test worlds, seasonal worlds or sharding remain
possible without a schema rewrite.
