# ADR-011 — Hexagonal world map with axial coordinates

**Status:** accepted (game design decision by the project owner)

**Decision.** The world map is a hex grid. Positions are axial `(q, r)`,
pointy-top; utilities are in `game-core/hex.ts`. Moving between hexes will cost
Action Points (amount to be defined; mechanic not implemented in phase 1).
