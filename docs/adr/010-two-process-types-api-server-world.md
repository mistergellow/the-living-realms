# ADR-010 — Two process types: API server + world worker (modular monolith)

**Status:** accepted

**Context.** The world must keep running with no players online; NPCs and
events need a clock independent of requests.

**Decision.** `apps/worker` runs the world tick loop and scheduled jobs. A
PostgreSQL advisory lock elects a single leader per world; extra workers are
standbys. Everything else is in one codebase and one image.

**Alternatives.** Microservices (operational overhead far beyond current
needs). Ticking inside the API server (couples simulation to request load and
duplicates ticks when scaling the API).

**Revisit when.** One tick loop cannot process the world in time: partition by
region (one lock per partition).
