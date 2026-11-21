# ADR-024 — Enemy intents planned at round start

**Status:** accepted (D36)

**Decision.** At the start of each round, each enemy plans its whole turn
(abilities and targets) with the Focus it will have; the plan is part of the
combat state and shown to players. During the enemy phase the plan is executed;
if a planned target is gone the enemy re-targets with its usual rule.

**Why.** Telegraphed enemy actions are what make "Slay the Spire" decisions
tactical (block now, kill the biggest threat, weaken the attacker).
