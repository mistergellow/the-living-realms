# ADR-008 — Redis for ephemeral, cross-process data only

**Status:** accepted

**Decision.** Redis holds pub/sub (the bus), presence, and rate-limit counters.
Nothing in Redis is required to reconstruct game state.

**Consequences.** Server instances are stateless, so they scale horizontally
and need no sticky sessions. A Redis outage degrades real-time features but
never loses data. Later use: job queue (BullMQ) for scheduled game events.
