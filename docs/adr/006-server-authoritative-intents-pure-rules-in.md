# ADR-006 — Server-authoritative intents; pure rules in `game-core`

**Status:** accepted

**Decision.** Clients send intents only. The server validates the shape (zod)
and the rules (`game-core`), executes in a DB transaction, then notifies.
`game-core` has no I/O and is deterministic; randomness and time will be
injected.

**Consequences.** It prevents cheating by construction. Rules are unit-testable
and replayable (useful for combat logs and dispute resolution). The client can
reuse the rules for previews.
