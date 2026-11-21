# ADR-001 — TypeScript across the whole stack, pnpm monorepo

**Status:** accepted (phase 1)

**Context.** Client and server must agree on request shapes, the real-time
protocol, error codes and game rules (e.g. name validation, hex distance).

**Decision.** TypeScript everywhere; pnpm workspaces with `apps/*` and
`packages/*`. Internal packages are consumed as TypeScript source (no build
step in development); production bundles are produced with esbuild/Vite.

**Consequences.** Contracts live once in `@realms/shared`; rules once in
`@realms/game-core`. Changing a contract breaks the build on both sides
immediately. Single toolchain. Nx/Turborepo were not adopted: unnecessary at
this size, easy to add later.
