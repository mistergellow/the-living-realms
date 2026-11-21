# ADR-015 — Character creation in phase 1: name + placeholder appearance

**Status:** accepted (agreed with the project owner)

**Decision.** Characters have a name (3–20 letters with single spaces,
apostrophes or hyphens; unique per world, case-insensitive) and a placeholder
appearance (`{version: 1, color, emblem}`). Origin, nation, attributes and
real appearance are deferred to the phases that design those systems. Deleted
characters are soft-deleted (their history remains) and their name is freed.
