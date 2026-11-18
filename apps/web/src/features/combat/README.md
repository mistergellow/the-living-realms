# Combat (reserved)

The combat screen lives in `features/rifts` (`CombatPage.tsx`, `CombatStage.tsx`)
and is drawn with PixiJS (`combat-scene.ts`, ADR-023). Shared canvas
infrastructure is in `features/render`.

This folder is reserved for combat UI that is not tied to Rifts (e.g. PvP,
later). See ARCHITECTURE.md → "Combat instances".
