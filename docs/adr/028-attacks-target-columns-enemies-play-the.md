# ADR-028 — Attacks target columns; enemies play the formation

**Status:** accepted (D41, D42)

**Decision.** Every attack picks a column (front, mid or back within its reach)
and hits both units in it; abilities that hit everything remain. Support
abilities on allies still pick one ally. Enemy AI scores each reachable column
and values Block more when it shares a column with a partner, so tanks such as
the Rift Bulwark shield their column while the other enemy attacks. Formations
are authored per Rift room, so harder Rifts can field smarter formations.

**Consequences.** Positioning both sides matters (stacking two units in a
column doubles exposure but enables column Block). Damage values were
rebalanced: melee hits harder than ranged/magic, which can reach any column.
