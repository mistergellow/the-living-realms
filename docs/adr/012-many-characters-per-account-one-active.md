# ADR-012 — Many characters per account, one active at a time

**Status:** accepted (game design decision by the project owner)

**Decision.** Accounts may own several characters (default limit 5, set by
`MAX_CHARACTERS_PER_ACCOUNT`). Only one may be in the world at a time per
account: entering with a new connection replaces the old one cluster-wide (WS
close code `4002`). The limit is enforced transactionally (account row lock).
