# ADR-019 — Apply migrations at process startup (advisory-locked)

**Status:** accepted

**Context.** Relying on the host's pre-deploy hook proved fragile: on the first
Railway deploys the hook did not run and the server crashed on missing tables.

**Decision.** `server` and `worker` call `migrateWithLock()` on boot
(`MIGRATE_ON_START`, default `true`). A PostgreSQL advisory lock serialises
concurrent starts; already-applied migrations are skipped. `migrate.js` stays
for manual or CI use, and the flag can be turned off if a platform runs
migrations separately.

**Consequences.** The app works on any host with no extra deploy step. A
migration error stops the process before it serves traffic (the previous
healthy deployment keeps running). Long, locking migrations must be avoided
or run manually during maintenance.
