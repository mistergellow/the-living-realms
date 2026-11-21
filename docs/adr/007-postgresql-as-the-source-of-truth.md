# ADR-007 — PostgreSQL as the source of truth; Drizzle ORM

**Status:** accepted

**Context.** An economy, trades and persistent progression need ACID
transactions, row locks and constraints. Relationships are rich (accounts →
characters → nations → items …).

**Decision.** PostgreSQL 16 with Drizzle ORM and drizzle-kit SQL migrations.
JSONB for evolving documents only.

**Alternatives.** MongoDB (weaker multi-document transactions and constraints:
risky for an economy). Prisma (heavier runtime, less control over SQL such as
partial and functional indexes, `FOR UPDATE`). Raw SQL (more boilerplate,
no type inference).
