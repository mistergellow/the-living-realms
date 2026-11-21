# ADR-016 — Testing against real PostgreSQL and Redis

**Status:** accepted

**Decision.** Integration tests run against real services (a separate test
database and Redis DB 15), not mocks. E2E tests use Playwright against the real
stack.

**Why.** The behaviours that matter most (unique constraints, row locks,
transactions, pub/sub) do not exist in mocks. CI provides both services.
