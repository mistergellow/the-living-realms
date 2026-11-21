# ADR-005 — Plain WebSockets with our own typed protocol (not Socket.IO or Colyseus yet)

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
