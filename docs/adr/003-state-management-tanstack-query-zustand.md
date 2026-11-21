# ADR-003 — State management: TanStack Query + Zustand

**Status:** accepted

**Decision.** REST/server data goes through **TanStack Query** (caching,
invalidation). Real-time world state goes in a **Zustand** store updated by a
**pure reducer** from WebSocket messages. Per-tab selection (active character)
lives in `sessionStorage`.

**Why.** It keeps "data I fetched" separate from "data being pushed to me". The
pure reducer is trivially unit-testable and could later be shared with a
replay/debug tool. Redux would add boilerplate without benefit.
