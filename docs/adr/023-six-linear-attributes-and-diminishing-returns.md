# ADR-023 — Six linear attributes and diminishing-returns mitigation (replaces D&D attributes)

**Status:** accepted (supersedes the D&D attribute part of M1)

**Context.** The owner found the D&D abilities a poor fit and the balance
swingy: D&D modifiers make most points meaningless, CHA/WIS were near-dead
stats, there are no levels to recover from a bad build, and flat armor made
small hits worthless and large hits barely affected.

**Decision.** Six attributes with linear effects (Might, Agility, Precision,
Vitality, Arcana, Spirit); base 5, 12 creation points, max 10 from points;
equipment adds more. Each weapon scales with two attributes; main and off-hand
abilities combine. Mitigation uses `reduction = rating / (rating + 50)` (each
point adds the same effective HP; never 100%), plus active Block. Damage uses
ranges. Existing characters were reset to 5s with 12 unspent points.

**Consequences.** Build variety comes from attribute × weapon × off-hand ×
status synergies rather than from attributes alone; balance is tuned against
simulation targets (A23). Formulas live in `STAT_RULES`.
