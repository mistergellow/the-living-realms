# Art sources

Original art sheets from the project owner (request #72). Pieces used by the
game are cut out with `scripts/art/cut-sheet.py` and assembled in code:

- `source/base-hero.webp` → `apps/web/src/features/avatar/base/*.webp`, rig in
  `CharacterAvatar.tsx` (ADR-054).

To add a sheet: put it in `source/`, run the script, pick the pieces you need
and place them in the rig (players face right; monsters use `--mirror`).
