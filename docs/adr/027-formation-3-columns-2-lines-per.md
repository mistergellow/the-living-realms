# ADR-027 — Formation: 3 columns × 2 lines per side

**Status:** accepted (D38; corrects the earlier "2 rows of 3" reading of D13)

**Decision.** Each side has three depth columns — front, mid, back — with two
lines each. Slots: 0–1 front, 2–3 mid, 4–5 back (even = top line). Abilities
declare a reach: `first` (the first occupied column; melee), `any`, or specific
columns; and an area: one target, a whole column (both lines) or everyone.
`columnOfSlot` in `@realms/shared` is the single source of truth.

**Consequences.** Column attacks hit at most 2 units; positioning across three
depths matters (mid is safe from melee while the front holds). Existing lobby
slots and active runs keep their numbers but are read with the new meaning.
