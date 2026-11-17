# Combat (reserved — not implemented in phase 1)

Turn-based strategic combat will live in this feature folder with its **own
route (`/combat/:id`) and its own renderer** (planned: PixiJS on a canvas),
completely separate from the exploration UI in `features/world`.

The server will host each fight as an independent _combat instance_; see
ARCHITECTURE.md → "Combat instances".
