# ADR-032 — Documentation split for cheap navigation

**Status.** Accepted (2026-11-21, request #31).

**Context.** The project is developed with an AI assistant whose working rules
required reading the full request log and impact map on every task (~160 KB of
docs, much of it table padding). Cost grew with every request.

**Decision.** Small entry point (`CLAUDE.md` with a code map) and documents
split so that one lookup opens one small file: one ADR per file in `docs/adr/`
with an index; game design decisions in `docs/GAME_DESIGN.md` as compact lists;
the impact map split by area in `docs/change-map/`; the request log keeps only
recent entries, older ones go to `docs/archive/`. Source files over ~400 lines
are split by responsibility; global CSS is an ordered `@import` index.

**Consequences.** Search first (`grep`), then read only the relevant section.
New ADRs, design values and impact-map entries go into the matching small file
and its index.
