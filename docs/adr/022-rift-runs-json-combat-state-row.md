# ADR-022 — Rift runs: JSON combat state, row locks, lazy turn timers

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
