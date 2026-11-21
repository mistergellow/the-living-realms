# ADR-025 — Lobbies and group combat refresh by polling (for now)

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
